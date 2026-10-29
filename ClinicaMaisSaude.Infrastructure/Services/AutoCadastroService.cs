using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D). Fluxo anônimo — anti-fraude leve (a avaliação presencial é o
    /// backstop real): CPF checksum + 1 solicitação aberta por CPF; o rate-limit por IP fica na borda.
    /// Fluxo admin (D3): lista as solicitações em análise e as aprova (convite de 1º acesso por e-mail)
    /// ou recusa (motivo por e-mail + encerra o perfil do proponente).
    /// </summary>
    public class AutoCadastroService : IAutoCadastroService
    {
        private readonly ClinicaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        // Versão dos termos de uso aceitos (consentimento LGPD). Bump ao trocar o texto dos termos,
        // junto com TERMOS_VERSAO em clinica-frontend/src/constants/termos.ts e no equivalente do mobile.
        private const string TermosVersaoAtual = "2.0";

        public AutoCadastroService(ClinicaDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<ModeloDeclaracaoSaudeResponse?> ObterDeclaracaoVigenteAsync()
        {
            var modelo = await _context.ModelosDeclaracaoSaude
                .AsNoTracking()
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.ModeloPadrao);

            if (modelo == null) return null;

            return new ModeloDeclaracaoSaudeResponse
            {
                ModeloId = modelo.Id,
                Nome = modelo.Nome,
                Perguntas = modelo.Perguntas
                    .OrderBy(p => p.Ordem)
                    .Select(p => new PerguntaDeclaracaoResponse { PerguntaId = p.Id, Pergunta = p.Pergunta, Ordem = p.Ordem })
                    .ToList()
            };
        }

        public async Task<CadastroResult> SolicitarAsync(SolicitacaoCadastroRequest request)
        {
            // ---- Normalização + validações de forma ----
            var nome = (request.Nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nome))
                return Falha("Informe o nome completo.");

            // Consentimento LGPD: aceite dos termos é obrigatório para prosseguir.
            if (!request.AceiteTermos)
                return Falha("É necessário aceitar os termos de uso para continuar.");

            var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return Falha("Informe um e-mail válido.");

            var cpf = Cpf.Sanitizar(request.Cpf);
            if (!Cpf.EhValido(cpf))
                return Falha("O CPF informado não é matematicamente válido.");

            // Telefone é OBRIGATÓRIO no wizard (DDD + número, 10 ou 11 dígitos).
            var telefone = new string((request.Telefone ?? string.Empty).Where(char.IsDigit).ToArray());
            if (telefone.Length != 10 && telefone.Length != 11)
                return Falha("Informe um telefone válido com DDD (10 ou 11 dígitos).");

            // ---- Modelo de DS: precisa ser o vigente (padrão) ----
            var modelo = await _context.ModelosDeclaracaoSaude
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.Id == request.ModeloId);
            if (modelo == null)
                return Falha("Declaração de saúde não encontrada. Recarregue o formulário.");
            if (!modelo.ModeloPadrao)
                return Falha("A declaração de saúde foi atualizada. Recarregue o formulário e responda novamente.");

            // ---- Respostas: cobrir exatamente as perguntas do modelo; "Sim" exige detalhe ----
            var perguntaIds = modelo.Perguntas.Select(p => p.Id).ToHashSet();
            var respostas = request.Respostas ?? new List<RespostaDeclaracaoItem>();
            var respondidas = respostas.Select(r => r.PerguntaId).ToHashSet();

            if (respostas.Count != respondidas.Count)
                return Falha("Há respostas duplicadas para a mesma pergunta.");
            if (!perguntaIds.SetEquals(respondidas))
                return Falha("Responda todas as perguntas da declaração de saúde (e apenas elas).");
            foreach (var r in respostas)
            {
                if (r.Resposta && string.IsNullOrWhiteSpace(r.Detalhe))
                    return Falha("As respostas \"Sim\" exigem um detalhamento.");
            }

            // ---- E-mail verificado: exige o token do passo de confirmação, amarrado a ESTE e-mail ----
            if (string.IsNullOrWhiteSpace(request.EmailVerificadoToken))
                return Falha("Confirme seu e-mail antes de enviar o cadastro.");
            var agora = DateTime.UtcNow;
            var tokenHash = CodigoVerificacaoCripto.HashResetTokenHex(request.EmailVerificadoToken);
            var tokenEmail = await _context.CodigosVerificacao.FirstOrDefaultAsync(c =>
                c.Tipo == TipoVerificacao.VerificacaoEmail && c.ResetTokenHash == tokenHash &&
                c.Email == email && c.DtExpiracaoReset > agora);
            if (tokenEmail == null)
                return Falha("A confirmação do e-mail expirou. Confirme o e-mail novamente.");

            // ---- Anti-fraude / dedupe por pessoa (CPF) ----
            var pessoa = await _context.Pessoas.FirstOrDefaultAsync(p => p.Cpf == cpf);

            if (pessoa != null)
            {
                var jaTemConta = await _context.Usuarios.AnyAsync(u => u.PessoaId == pessoa.Id);
                if (jaTemConta)
                    return Falha("Já existe uma conta com este CPF. Use o acesso ou a recuperação de senha.");

                var solicitacaoAberta = await _context.SolicitacoesCadastro
                    .AnyAsync(s => s.PessoaId == pessoa.Id && s.Status == StatusSolicitacao.EmAnalise);
                if (solicitacaoAberta)
                    return Falha("Já existe uma solicitação em análise para este CPF. Aguarde o contato da clínica.");
            }

            // E-mail é único (identidade): não pode colidir com OUTRA pessoa.
            var emailDeOutro = await _context.Pessoas
                .AnyAsync(p => p.Email == email && (pessoa == null || p.Id != pessoa.Id));
            if (emailDeOutro)
                return Falha("Este e-mail já está em uso.");

            // ---- Criação/reuso: Pessoa + Paciente (proponente) + Solicitação + Respostas ----
            if (pessoa == null)
            {
                pessoa = new Pessoa(nome, cpf, email, telefone);
                _context.Pessoas.Add(pessoa);
            }
            else
            {
                // Reaplicação (solicitação anterior recusada): reaproveita a Pessoa (CPF único).
                pessoa.AtualizarNome(nome);
                pessoa.AtualizarEmail(email);
                pessoa.AtualizarTelefone(telefone);
            }

            var pacienteExistente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PessoaId == pessoa.Id);
            if (pacienteExistente == null)
            {
                var proponente = Paciente.NovoProponente(pessoa.Id, request.TemProblemaMemoria);
                _context.Pacientes.Add(proponente);
            }
            else
            {
                pacienteExistente.ReabrirComoProponente(request.TemProblemaMemoria);
            }

            var solicitacao = new SolicitacaoCadastro(pessoa.Id, modelo.Id);
            solicitacao.RegistrarConsentimento(TermosVersaoAtual);
            _context.SolicitacoesCadastro.Add(solicitacao);

            foreach (var r in respostas)
            {
                _context.RespostasDeclaracaoSaude.Add(
                    new RespostaDeclaracaoSaude(solicitacao.Id, r.PerguntaId, r.Resposta, r.Detalhe));
            }

            // Token de e-mail verificado é de uso único: consome ao concretizar a solicitação.
            _context.CodigosVerificacao.Remove(tokenEmail);

            await _context.SaveChangesAsync();

            // Confirmação ao proponente de que a solicitação chegou (o e-mail já foi verificado no wizard).
            await EnviarEmailAsync(pessoa, "Recebemos a sua solicitação de cadastro",
                CorpoConfirmacao(pessoa.Nome), TextoConfirmacao(pessoa.Nome));

            return new CadastroResult
            {
                Sucesso = true,
                Mensagem = "Solicitação enviada! Compareça à clínica para a avaliação. Você será avisado por e-mail sobre a decisão."
            };
        }

        // ----------------- Fluxo admin (D3): fila de aprovação, histórico e retificação -----------------

        public async Task<SolicitacoesPaginadasResponse> ListarSolicitacoesAsync(StatusSolicitacao status, string? busca, int page, int pageSize)
        {
            var todas = _context.SolicitacoesCadastro.AsNoTracking();

            // Indicadores e contagem das abas (não dependem da busca nem da página).
            var totalEmAnalise = await todas.CountAsync(s => s.Status == StatusSolicitacao.EmAnalise);
            var totalAprovadas = await todas.CountAsync(s => s.Status == StatusSolicitacao.Aprovada);
            var totalRecusadas = await todas.CountAsync(s => s.Status == StatusSolicitacao.Recusada);
            var totalRequerApoio = await todas.CountAsync(s => s.Status == StatusSolicitacao.EmAnalise &&
                _context.Pacientes.Any(p => p.PessoaId == s.PessoaId && p.TemProblemaMemoria));

            var filtradas = todas.Where(s => s.Status == status);
            if (!string.IsNullOrWhiteSpace(busca))
            {
                // Uma coluna só: dígitos = CPF por prefixo (usa o índice); texto = nome por "contém".
                var termo = busca.Trim();
                if (Cpf.EhTermoDeBusca(termo))
                {
                    var digitos = Cpf.Sanitizar(termo);
                    filtradas = filtradas.Where(s => s.Pessoa!.Cpf.StartsWith(digitos));
                }
                else
                {
                    filtradas = filtradas.Where(s => s.Pessoa!.Nome.Contains(termo));
                }
            }

            // Em análise é fila (mais antigas primeiro); decididas mostram a decisão mais recente primeiro.
            var ordenadas = status == StatusSolicitacao.EmAnalise
                ? filtradas.OrderBy(s => s.DtCriado)
                : filtradas.OrderByDescending(s => s.UltAtualizacao ?? s.DtCriado);

            var totalFiltrado = await filtradas.CountAsync();
            var solicitacoes = await ordenadas
                .Include(s => s.Pessoa)
                .Include(s => s.Respostas).ThenInclude(r => r.Pergunta)
                .Include(s => s.Historico)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .AsSplitQuery()
                .ToListAsync();

            // Dados de outras tabelas, em lote: apoio de memória (Paciente), contas já criadas,
            // solicitações mais novas da mesma pessoa e nomes de quem decidiu.
            var pessoaIds = solicitacoes.Select(s => s.PessoaId).Distinct().ToList();
            var problemaMemoriaPorPessoa = await _context.Pacientes
                .AsNoTracking()
                .Where(p => p.PessoaId != null && pessoaIds.Contains(p.PessoaId.Value))
                .ToDictionaryAsync(p => p.PessoaId!.Value, p => p.TemProblemaMemoria);
            var pessoasComConta = (await _context.Usuarios.AsNoTracking()
                .Where(u => u.PessoaId != null && pessoaIds.Contains(u.PessoaId.Value))
                .Select(u => u.PessoaId!.Value)
                .ToListAsync()).ToHashSet();
            var ultimaSolicitacaoPorPessoa = await _context.SolicitacoesCadastro.AsNoTracking()
                .Where(s => pessoaIds.Contains(s.PessoaId))
                .GroupBy(s => s.PessoaId)
                .Select(g => new { PessoaId = g.Key, Ultima = g.Max(s => s.DtCriado) })
                .ToDictionaryAsync(x => x.PessoaId, x => x.Ultima);
            var autorIds = solicitacoes.SelectMany(s => s.Historico)
                .Where(h => h.RealizadoPor != null).Select(h => h.RealizadoPor!.Value).Distinct().ToList();
            var nomePorUsuario = await _context.Usuarios.AsNoTracking()
                .Where(u => autorIds.Contains(u.Id))
                .Select(u => new { u.Id, Nome = u.Pessoa!.Nome })
                .ToDictionaryAsync(x => x.Id, x => x.Nome);

            string? NomeDe(Guid? usuarioId) =>
                usuarioId != null && nomePorUsuario.TryGetValue(usuarioId.Value, out var nome) ? nome : null;

            var itens = solicitacoes.Select(s =>
            {
                var historico = s.Historico.OrderBy(h => h.DtCriado).ToList();
                var ultima = historico.LastOrDefault();
                var bloqueio = MotivoNaoRetificavel(s, pessoasComConta.Contains(s.PessoaId),
                    ultimaSolicitacaoPorPessoa.TryGetValue(s.PessoaId, out var maisNova) && maisNova > s.DtCriado);
                return new SolicitacaoAdminResponse
                {
                    SolicitacaoId = s.Id,
                    DtCriado = s.DtCriado,
                    Nome = s.Pessoa?.Nome ?? string.Empty,
                    Cpf = s.Pessoa?.Cpf ?? string.Empty,
                    Email = s.Pessoa?.Email ?? string.Empty,
                    Telefone = s.Pessoa?.Telefone,
                    TemProblemaMemoria = problemaMemoriaPorPessoa.TryGetValue(s.PessoaId, out var tpm) && tpm,
                    Respostas = s.Respostas
                        .OrderBy(r => r.Pergunta?.Ordem ?? 0)
                        .Select(r => new RespostaAdminItem
                        {
                            Pergunta = r.Pergunta?.Pergunta ?? string.Empty,
                            Ordem = r.Pergunta?.Ordem ?? 0,
                            Resposta = r.Resposta,
                            Detalhe = r.Detalhe
                        })
                        .ToList(),
                    Status = s.Status.ToString(),
                    MotivoRecusa = s.MotivoRecusa,
                    DecididaEm = ultima?.DtCriado,
                    DecididaPor = NomeDe(ultima?.RealizadoPor),
                    PodeRetificar = bloqueio == null,
                    MotivoNaoRetificavel = bloqueio,
                    Historico = historico.Select(h => new HistoricoSolicitacaoItem
                    {
                        StatusAnterior = h.StatusAnterior.ToString(),
                        StatusNovo = h.StatusNovo.ToString(),
                        Motivo = h.Motivo,
                        RealizadoPor = NomeDe(h.RealizadoPor),
                        Dt = h.DtCriado
                    }).ToList()
                };
            }).ToList();

            return new SolicitacoesPaginadasResponse
            {
                Items = itens,
                TotalCount = totalFiltrado,
                Page = page,
                PageSize = pageSize,
                TotalEmAnalise = totalEmAnalise,
                TotalRequerApoio = totalRequerApoio,
                TotalAprovadas = totalAprovadas,
                TotalRecusadas = totalRecusadas
            };
        }

        // Regras de retificação que dependem de outras tabelas. Nulo = pode retificar.
        private static string? MotivoNaoRetificavel(SolicitacaoCadastro s, bool jaTemConta, bool temSolicitacaoMaisNova)
        {
            if (s.EstaEmAnalise)
                return "A solicitação ainda está em análise.";
            if (temSolicitacaoMaisNova)
                return "O proponente enviou uma solicitação mais nova; avalie a mais recente.";
            if (s.Status == StatusSolicitacao.Aprovada && jaTemConta)
                return "O proponente já concluiu o primeiro acesso. Para retirar o acesso, desative o paciente na tela de Pacientes.";
            return null;
        }

        public async Task<CadastroResult> AprovarAsync(Guid solicitacaoId, Guid? realizadoPor = null)
        {
            var solicitacao = await _context.SolicitacoesCadastro
                .Include(s => s.Pessoa)
                .FirstOrDefaultAsync(s => s.Id == solicitacaoId);
            if (solicitacao == null)
                return Falha("Solicitação não encontrada.");
            if (!solicitacao.EstaEmAnalise)
                return Falha("Esta solicitação já foi decidida.");

            solicitacao.Aprovar(realizadoPor);
            await _context.SaveChangesAsync();

            // Convite de 1º acesso: o proponente conclui o cadastro definindo a senha no app (fluxo
            // pull — o código é gerado quando ELE inicia o 1º acesso, não empurrado aqui; ver D4).
            await EnviarEmailAsync(solicitacao.Pessoa!, "Cadastro aprovado — faça seu primeiro acesso",
                CorpoAprovacao(solicitacao.Pessoa!.Nome), TextoAprovacao(solicitacao.Pessoa!.Nome));

            return new CadastroResult
            {
                Sucesso = true,
                Mensagem = "Solicitação aprovada. O proponente foi avisado por e-mail para concluir o primeiro acesso."
            };
        }

        public async Task<CadastroResult> RecusarAsync(Guid solicitacaoId, string motivo, Guid? realizadoPor = null)
        {
            if (string.IsNullOrWhiteSpace(motivo))
                return Falha("Informe o motivo da recusa.");

            var solicitacao = await _context.SolicitacoesCadastro
                .Include(s => s.Pessoa)
                .FirstOrDefaultAsync(s => s.Id == solicitacaoId);
            if (solicitacao == null)
                return Falha("Solicitação não encontrada.");
            if (!solicitacao.EstaEmAnalise)
                return Falha("Esta solicitação já foi decidida.");

            solicitacao.Recusar(motivo, realizadoPor);

            // O perfil do proponente (sem conta) é encerrado; a Pessoa permanece (CPF único), então
            // ele pode reaplicar depois — o SolicitarAsync reabre via Paciente.ReabrirComoProponente.
            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PessoaId == solicitacao.PessoaId);
            paciente?.Excluir();

            await _context.SaveChangesAsync();

            await EnviarEmailAsync(solicitacao.Pessoa!, "Sobre a sua solicitação de cadastro",
                CorpoRecusa(solicitacao.Pessoa!.Nome, solicitacao.MotivoRecusa!),
                TextoRecusa(solicitacao.Pessoa!.Nome, solicitacao.MotivoRecusa!));

            return new CadastroResult
            {
                Sucesso = true,
                Mensagem = "Solicitação recusada. O proponente foi avisado por e-mail."
            };
        }

        public async Task<CadastroResult> RetificarAsync(Guid solicitacaoId, string motivo, Guid? realizadoPor = null)
        {
            if (string.IsNullOrWhiteSpace(motivo))
                return Falha("Informe o motivo da retificação.");

            var solicitacao = await _context.SolicitacoesCadastro
                .Include(s => s.Pessoa)
                .FirstOrDefaultAsync(s => s.Id == solicitacaoId);
            if (solicitacao == null)
                return Falha("Solicitação não encontrada.");

            var jaTemConta = await _context.Usuarios.AnyAsync(u => u.PessoaId == solicitacao.PessoaId);
            var temMaisNova = await _context.SolicitacoesCadastro.AnyAsync(s =>
                s.PessoaId == solicitacao.PessoaId && s.DtCriado > solicitacao.DtCriado);
            var bloqueio = MotivoNaoRetificavel(solicitacao, jaTemConta, temMaisNova);
            if (bloqueio != null)
                return Falha(bloqueio);

            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PessoaId == solicitacao.PessoaId);
            var eraAprovada = solicitacao.Status == StatusSolicitacao.Aprovada;
            solicitacao.Retificar(motivo, realizadoPor);

            if (eraAprovada)
            {
                // Aprovada → Recusada: encerra o perfil como numa recusa e invalida códigos de 1º acesso
                // já emitidos, para ninguém concluir a conta com um código de antes da retificação.
                paciente?.Excluir();
                var codigos = await _context.CodigosVerificacao
                    .Where(c => c.Tipo == TipoVerificacao.PrimeiroAcesso && c.PessoaId == solicitacao.PessoaId)
                    .ToListAsync();
                _context.CodigosVerificacao.RemoveRange(codigos);
            }
            else
            {
                // Recusada → Aprovada: o perfil (encerrado na recusa) volta a proponente em análise,
                // estado esperado pelo 1º acesso.
                paciente?.ReabrirComoProponente(paciente.TemProblemaMemoria);
            }

            await _context.SaveChangesAsync();

            if (eraAprovada)
                await EnviarEmailAsync(solicitacao.Pessoa!, "Sobre a sua solicitação de cadastro",
                    CorpoRecusa(solicitacao.Pessoa!.Nome, solicitacao.MotivoRecusa!),
                    TextoRecusa(solicitacao.Pessoa!.Nome, solicitacao.MotivoRecusa!));
            else
                await EnviarEmailAsync(solicitacao.Pessoa!, "Cadastro aprovado — faça seu primeiro acesso",
                    CorpoAprovacao(solicitacao.Pessoa!.Nome), TextoAprovacao(solicitacao.Pessoa!.Nome));

            return new CadastroResult
            {
                Sucesso = true,
                Mensagem = eraAprovada
                    ? "Decisão retificada para recusada. O proponente foi avisado por e-mail."
                    : "Decisão retificada para aprovada. O proponente foi avisado por e-mail para concluir o primeiro acesso."
            };
        }

        // ----------------- E-mail (identidade navy compartilhada em EmailTemplates) -----------------

        private Task EnviarEmailAsync(Pessoa pessoa, string assunto, string html, string texto) =>
            _emailService.EnviarAsync(pessoa.Email, assunto, html, texto);

        private string CorpoConfirmacao(string nome) => EmailTemplates.ProsaHtml(EmailTemplates.LogoSrc(_configuration), EmailTemplates.Saudacao(nome), $@"
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              Recebemos a sua solicitação de cadastro na <strong style=""color:#0F172A"">Clínica Mais Saúde</strong>
              e o seu e-mail foi confirmado.
            </p>
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              O próximo passo é a <strong style=""color:#2C5282"">avaliação presencial</strong> na clínica. Após
              ela, avisaremos por este e-mail se o cadastro foi aprovado.
            </p>
            <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
              Qualquer dúvida, fale com a recepção da clínica.
            </p>");

        private static string TextoConfirmacao(string nome) =>
            EmailTemplates.Texto("Solicitação de cadastro recebida",
$@"{EmailTemplates.Saudacao(nome)}.

Recebemos a sua solicitação de cadastro e o seu e-mail foi confirmado.
O próximo passo é a avaliação presencial na clínica. Após ela, avisaremos
por este e-mail se o cadastro foi aprovado.

Qualquer dúvida, fale com a recepção da clínica.");

        private string CorpoAprovacao(string nome) => EmailTemplates.ProsaHtml(EmailTemplates.LogoSrc(_configuration), EmailTemplates.Saudacao(nome), $@"
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              Boas notícias! Sua solicitação de cadastro na <strong style=""color:#0F172A"">Clínica Mais Saúde</strong>
              foi <strong style=""color:#2C5282"">aprovada</strong>.
            </p>
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              Para concluir, abra o aplicativo e inicie o <strong style=""color:#0F172A"">primeiro acesso</strong>:
              enviaremos um código de verificação para este e-mail e você definirá a sua senha.
            </p>
            <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
              Qualquer dúvida, fale com a recepção da clínica.
            </p>");

        private static string TextoAprovacao(string nome) =>
            EmailTemplates.Texto("Cadastro aprovado",
$@"{EmailTemplates.Saudacao(nome)}.

Sua solicitação de cadastro foi aprovada.
Para concluir, abra o aplicativo e inicie o primeiro acesso: enviaremos um
código de verificação para este e-mail e você definirá a sua senha.

Qualquer dúvida, fale com a recepção da clínica.");

        private string CorpoRecusa(string nome, string motivo) => EmailTemplates.ProsaHtml(EmailTemplates.LogoSrc(_configuration), EmailTemplates.Saudacao(nome), $@"
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              Agradecemos o seu interesse. Após a avaliação, não foi possível concluir a sua
              solicitação de cadastro na <strong style=""color:#0F172A"">Clínica Mais Saúde</strong> neste momento.
            </p>
            <div style=""font-size:14px;color:#0F172A;background:#F8FAFC;border:1px solid #E2E8F0;
                        border-radius:12px;padding:14px 16px;margin:0 0 18px"">
              <span style=""color:#475569"">Motivo:</span> {System.Net.WebUtility.HtmlEncode(motivo)}
            </div>
            <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
              Se achar que houve um engano, procure a recepção da clínica — você pode solicitar novamente.
            </p>");

        private static string TextoRecusa(string nome, string motivo) =>
            EmailTemplates.Texto("Sobre a sua solicitação de cadastro",
$@"{EmailTemplates.Saudacao(nome)}.

Após a avaliação, não foi possível concluir a sua solicitação de cadastro neste momento.

Motivo: {motivo}

Se achar que houve um engano, procure a recepção da clínica — você pode solicitar novamente.");

        private static CadastroResult Falha(string mensagem) =>
            new CadastroResult { Sucesso = false, Mensagem = mensagem };
    }
}
