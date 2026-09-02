using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
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

        // Versão dos termos de uso aceitos (consentimento LGPD). Bump ao trocar o texto dos termos.
        private const string TermosVersaoAtual = "1.0";

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

        // ----------------- Fluxo admin (D3): fila de aprovação -----------------

        public async Task<List<SolicitacaoAdminResponse>> ListarSolicitacoesEmAnaliseAsync()
        {
            var solicitacoes = await _context.SolicitacoesCadastro
                .AsNoTracking()
                .Where(s => s.Status == StatusSolicitacao.EmAnalise)
                .Include(s => s.Pessoa)
                .Include(s => s.Respostas).ThenInclude(r => r.Pergunta)
                .OrderBy(s => s.DtCriado)
                .ToListAsync();

            // TemProblemaMemoria vive no Paciente (proponente): carrega em lote por PessoaId.
            var pessoaIds = solicitacoes.Select(s => s.PessoaId).ToList();
            var problemaMemoriaPorPessoa = await _context.Pacientes
                .AsNoTracking()
                .Where(p => p.PessoaId != null && pessoaIds.Contains(p.PessoaId.Value))
                .ToDictionaryAsync(p => p.PessoaId!.Value, p => p.TemProblemaMemoria);

            return solicitacoes.Select(s => new SolicitacaoAdminResponse
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
                    .ToList()
            }).ToList();
        }

        public async Task<CadastroResult> AprovarAsync(Guid solicitacaoId)
        {
            var solicitacao = await _context.SolicitacoesCadastro
                .Include(s => s.Pessoa)
                .FirstOrDefaultAsync(s => s.Id == solicitacaoId);
            if (solicitacao == null)
                return Falha("Solicitação não encontrada.");
            if (!solicitacao.EstaEmAnalise)
                return Falha("Esta solicitação já foi decidida.");

            solicitacao.Aprovar();
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

        public async Task<CadastroResult> RecusarAsync(Guid solicitacaoId, string motivo)
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

            solicitacao.Recusar(motivo);

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

        // ----------------- E-mail (identidade navy, ver RecuperacaoSenhaService) -----------------

        private Task EnviarEmailAsync(Pessoa pessoa, string assunto, string html, string texto) =>
            _emailService.EnviarAsync(pessoa.Email, assunto, html, texto);

        private static string PrimeiroNome(string nome) =>
            string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];

        private static string Saudacao(string nome)
        {
            var pn = PrimeiroNome(nome);
            return string.IsNullOrEmpty(pn) ? "Olá" : $"Olá, {pn}";
        }

        private string LogoSrc()
        {
            var logo = _configuration[ConfigKeys.EmailLogoUrl];
            return string.IsNullOrWhiteSpace(logo) ? "cid:logoclinica" : logo;
        }

        private string CorpoConfirmacao(string nome) => Layout(Saudacao(nome), $@"
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
$@"CLÍNICA MAIS SAÚDE
Solicitação de cadastro recebida

{Saudacao(nome)}.

Recebemos a sua solicitação de cadastro e o seu e-mail foi confirmado.
O próximo passo é a avaliação presencial na clínica. Após ela, avisaremos
por este e-mail se o cadastro foi aprovado.

Qualquer dúvida, fale com a recepção da clínica.

—
Clínica Mais Saúde • e-mail automático, não responda.";

        private string CorpoAprovacao(string nome) => Layout(Saudacao(nome), $@"
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
$@"CLÍNICA MAIS SAÚDE
Cadastro aprovado

{Saudacao(nome)}.

Sua solicitação de cadastro foi aprovada.
Para concluir, abra o aplicativo e inicie o primeiro acesso: enviaremos um
código de verificação para este e-mail e você definirá a sua senha.

Qualquer dúvida, fale com a recepção da clínica.

—
Clínica Mais Saúde • e-mail automático, não responda.";

        private string CorpoRecusa(string nome, string motivo) => Layout(Saudacao(nome), $@"
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
$@"CLÍNICA MAIS SAÚDE
Sobre a sua solicitação de cadastro

{Saudacao(nome)}.

Após a avaliação, não foi possível concluir a sua solicitação de cadastro neste momento.

Motivo: {motivo}

Se achar que houve um engano, procure a recepção da clínica — você pode solicitar novamente.

—
Clínica Mais Saúde • e-mail automático, não responda.";

        // Moldura navy comum aos e-mails deste fluxo (cabeçalho com logo + rodapé).
        private string Layout(string saudacao, string miolo) => $@"
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""
       style=""background:#F1F5F9;margin:0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"">
  <tr><td align=""center"">
    <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0""
           style=""width:480px;max-width:100%;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden"">
      <tr>
        <td align=""center"" style=""background:#2C5282;padding:16px 24px"">
          <img src=""{LogoSrc()}"" alt=""Clínica Mais Saúde"" width=""44""
               style=""display:block;width:44px;height:auto;margin:0 auto 4px;border:0"" />
          <div style=""color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.3px"">Clínica Mais Saúde</div>
        </td>
      </tr>
      <tr>
        <td style=""padding:30px 32px 8px;color:#0F172A"">
          <p style=""font-size:16px;font-weight:bold;margin:0 0 12px"">{saudacao}.</p>
          {miolo}
        </td>
      </tr>
      <tr>
        <td style=""background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px"">
          <p style=""font-size:11px;color:#94A3B8;text-align:center;margin:0;line-height:16px"">
            Este é um e-mail automático da Clínica Mais Saúde. Por favor, não responda.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>";

        private static CadastroResult Falha(string mensagem) =>
            new CadastroResult { Sucesso = false, Mensagem = mensagem };
    }
}
