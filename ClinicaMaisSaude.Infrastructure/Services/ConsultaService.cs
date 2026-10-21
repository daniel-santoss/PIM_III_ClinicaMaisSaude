using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Gateways;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class ConsultaService : IConsultaService
    {
        private readonly ClinicaDbContext _context;
        private readonly IDistributedCache _cache;
        private readonly IDataHoraService _dataHora;
        private readonly INotificadorTempoReal _notificadorTempoReal;
        private readonly ITriagemIaGateway _triagemIa;

        // Corpo legal completo devolvido ao cliente quando há injeção/bloqueio de segurança. A IA é
        // instruída (REGRA CRÍTICA 2 do gateway) a emitir esse mesmo texto; como a recusa por SAFETY
        // não traz texto, este é o texto canônico da resposta em ambos os caminhos.
        private const string MensagemInjecao = "Detectamos uma tentativa deliberada de obtenção de credenciais privadas e ativos de domínio por meio da Inteligência Artificial do sistema. Esta conduta configura Invasão de Dispositivo Informático, conforme o Art. 154-A do Código Penal (Lei 12.737/2012) e violação dos princípios de segurança e confidencialidade da Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD).";

        // Mensagem de ACOLHIMENTO quando o provedor recusa processar o conteúdo (ambíguo — pode ser
        // sofrimento real). NÃO há punição neste caminho: orienta e oferece ajuda.
        private const string MensagemRecusaSeguranca = "Não consegui analisar sua descrição com segurança. Se você estiver passando por um momento difícil ou pensando em se machucar, procure ajuda agora: ligue 188 (CVV, gratuito, 24h) ou vá ao pronto-socorro mais próximo. Você também pode reformular os sintomas e tentar novamente.";

        // Marcador que a IA emite (REGRA CRÍTICA 4) ao identificar crise emocional/automutilação/ideação
        // suicida. Não é punição nem erro: aciona o fluxo de acolhimento no front (mensagem + oferta de
        // agendar Psiquiatria).
        private const string MarcadorCrise = "APOIO_CRISE";

        // Mensagem de acolhimento exibida no caso de crise emocional. Tom humano, com canal de ajuda imediato.
        private const string MensagemApoioCrise = "Sentimos muito que você esteja passando por isso. Você não está sozinho, e procurar ajuda é um passo corajoso. Se estiver em risco ou precisar conversar agora, ligue 188 (CVV, gratuito e sigiloso, 24h) ou vá ao pronto-socorro mais próximo. Se quiser, podemos ajudar você a agendar uma consulta com um psiquiatra.";

        public ConsultaService(
            ClinicaDbContext context,
            IDistributedCache cache,
            IDataHoraService dataHora,
            INotificadorTempoReal notificadorTempoReal,
            ITriagemIaGateway triagemIa)
        {
            _context = context;
            _cache = cache;
            _dataHora = dataHora;
            _notificadorTempoReal = notificadorTempoReal;
            _triagemIa = triagemIa;
        }

        // Empurra em tempo real (best-effort) todas as notificações criadas num bloco,
        // após o commit. Centralizado aqui para não repetir o loop nos vários pontos.
        private async Task PushRealtimeAsync(IEnumerable<Notificacao> notificacoes)
        {
            foreach (var n in notificacoes)
            {
                await _notificadorTempoReal.NotificarAsync(n);
            }
        }

        // Lê a janela deslizante de timestamps (ticks UTC) do cache distribuído.
        // Ticks (long) evitam qualquer ambiguidade de fuso/Kind na (de)serialização.
        private async Task<List<long>> LerJanelaAsync(string key)
        {
            var json = await _cache.GetStringAsync(key);
            if (string.IsNullOrEmpty(json)) return new List<long>();
            try { return JsonSerializer.Deserialize<List<long>>(json) ?? new List<long>(); }
            catch { return new List<long>(); }
        }

        // Grava a janela com expiração absoluta (o próprio store descarta a chave ociosa).
        private async Task GravarJanelaAsync(string key, List<long> janela, TimeSpan ttl)
        {
            var json = JsonSerializer.Serialize(janela);
            await _cache.SetStringAsync(key, json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            });
        }

        public async Task<object> SugerirTipoAsync(string sintomas, Guid? pacienteId, string? tipoUsuario, bool isAdmin, Guid usuarioLogadoId)
        {
            var agora = DateTime.UtcNow;

            // 1. Rate Limit Global (100 requisições por hora) — janela deslizante em cache distribuído
            var globalKey = ConfigKeys.RateLimitGlobal;
            var globalRequests = await LerJanelaAsync(globalKey);
            globalRequests.RemoveAll(t => t < agora.AddHours(-1).Ticks);
            if (globalRequests.Count >= 100)
            {
                throw new RateLimitExceededException("O sistema de triagem está sob alta carga. Limite global excedido. Tente novamente em alguns minutos.");
            }

            // 2. Rate Limit por Usuário (5 requisições por dia)
            var userKey = $"{ConfigKeys.RateLimitUser}{usuarioLogadoId}";
            var userRequests = await LerJanelaAsync(userKey);
            userRequests.RemoveAll(t => t < agora.AddDays(-1).Ticks);
            if (userRequests.Count >= 5)
            {
                throw new RateLimitExceededException("Você atingiu o limite de 5 sugestões de triagem por dia. Tente novamente amanhã.");
            }

            // Registra as tentativas
            globalRequests.Add(agora.Ticks);
            userRequests.Add(agora.Ticks);
            await GravarJanelaAsync(globalKey, globalRequests, TimeSpan.FromHours(1));
            await GravarJanelaAsync(userKey, userRequests, TimeSpan.FromDays(1));

            Paciente? paciente = null;

            if (pacienteId.HasValue)
            {
                paciente = await _context.Pacientes.Include(p => p.Usuario).Include(p => p.Pessoa).FirstOrDefaultAsync(p => p.Id == pacienteId.Value);
                if (paciente == null)
                    throw new NotFoundException("Paciente não encontrado.");

                if (paciente.Usuario.IsIABloqueada())
                {
                    var dataBloqueio = _dataHora.ParaBrasilia(paciente.Usuario.BloqueadoIAAte!.Value).ToString("dd/MM/yyyy HH:mm");
                    throw new ForbiddenException($"Acesso à IA bloqueado até {dataBloqueio}. Se acha que é um erro, entre em contato: suporte@clinicamaissaude.com");
                }
            }
            else if (tipoUsuario != PerfisUsuario.Enfermeira && tipoUsuario != PerfisUsuario.Medico && !isAdmin)
            {
                throw new ForbiddenException("Usuário não é um paciente válido.");
            }

            if (string.IsNullOrWhiteSpace(sintomas) || sintomas.Length < 10)
                throw new ValidationException("Descreva os sintomas com pelo menos 10 caracteres.");

            if (sintomas.Length > 300)
                throw new ValidationException("Limite de 300 caracteres para a descrição dos sintomas.");

            // Fronteira externa: o gateway fala com a IA e devolve um desfecho normalizado.
            var resultado = await _triagemIa.ClassificarSintomasAsync(sintomas);

            // Injeção CONFIRMADA pela IA (marcador): pune (banir/bloquear + auditar + notificar) e responde o texto legal.
            if (resultado.Tipo == ResultadoTriagem.InjecaoDetectada)
                return await PunirInjecaoAsync(usuarioLogadoId, sintomas);

            // Recusa do provedor por conteúdo sensível: AMBÍGUO (mais provável sofrimento real que ataque).
            // NÃO pune — acolhe e orienta. A injeção verdadeira já foi tratada acima pelo marcador.
            if (resultado.Tipo == ResultadoTriagem.RecusadoPorSeguranca)
                throw new ValidationException(MensagemRecusaSeguranca);

            var textoResposta = resultado.TextoJson;

            // Crise emocional / automutilação / ideação suicida: acolhe, sem punir. Devolve a mensagem de
            // apoio e a sugestão de Psiquiatria (o front decide se pergunta e encaminha ao agendamento).
            if (textoResposta != null && textoResposta.Contains(MarcadorCrise))
                return new
                {
                    crise = true,
                    mensagem = MensagemApoioCrise,
                    tipoProfissional = "Medico",
                    especialidade = "Psiquiatria",
                    tipoConsulta = "Consulta Médica",
                    tipo = "Consulta Médica"
                };

            // Sintomas irrelevantes à saúde: penalidade progressiva (só para paciente) e recusa.
            if (paciente != null && textoResposta != null && textoResposta.Contains("Sintomas inválidos"))
                await PenalizarSintomasInvalidosAsync(paciente, sintomas); // lança ValidationException

            var serializeOptions = new JsonSerializerOptions { AllowTrailingCommas = true, ReadCommentHandling = JsonCommentHandling.Skip };
            return JsonSerializer.Deserialize<object>(textoResposta!, serializeOptions)!;
        }

        // Punição por injeção de prompt / recusa de segurança. Unifica os dois gatilhos (SAFETY sem
        // texto e marcador de injeção no texto), que antes eram blocos idênticos duplicados:
        // ban permanente (paciente) ou bloqueio de conta (staff), auditoria, cancelamento em cascata
        // dos agendamentos e alerta aos admins. Devolve o texto legal para o cliente.
        private async Task<object> PunirInjecaoAsync(Guid usuarioLogadoId, string sintomas)
        {
            var userObj = await _context.Usuarios.Include(u => u.Pessoa).FirstOrDefaultAsync(u => u.Id == usuarioLogadoId);
            if (userObj != null)
            {
                // Banimento permanente: paciente vira Situacao=Banido; staff (sem perfil de paciente)
                // cai no bloqueio de conta como fallback.
                var pacienteBan = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioLogadoId);
                if (pacienteBan != null) pacienteBan.Banir();
                else userObj.BloquearPermanentemente();

                _context.UsoInadequadoIA.Add(new UsoInadequadoIA(usuarioLogadoId, TipoViolacao.Injecao, sintomas));

                var notificacoes = await CancelarAgendamentosENotificarAsync(usuarioLogadoId);

                var admins = await _context.Usuarios.AsNoTracking().Where(u => u.Role == RoleUsuario.Admin).ToListAsync();
                foreach (var admin in admins)
                {
                    var notificacao = new Notificacao(
                        admin.Id,
                        "Violação Grave de IA",
                        $"Tentativa grave de injeção de prompt detectada pelo usuário {userObj.Pessoa?.Email} (CPF: {userObj.Pessoa?.Cpf}). Conta bloqueada automaticamente.",
                        link: $"violacoes?busca={userObj.Pessoa?.Cpf}"
                    );
                    _context.Notificacoes.Add(notificacao);
                    notificacoes.Add(notificacao);
                }

                await _context.SaveChangesAsync();
                await PushRealtimeAsync(notificacoes);
            }

            return new { justificativa = MensagemInjecao };
        }

        // Penalidade por sintomas irrelevantes à saúde (uso indevido, não injeção). Progressiva por
        // reincidência: 2ª violação bloqueia a IA por 1 dia, 3ª+ por 7 dias; sempre audita e alerta
        // os admins. Sempre encerra lançando ValidationException (o fluxo não segue para a triagem).
        private async Task PenalizarSintomasInvalidosAsync(Paciente paciente, string sintomas)
        {
            var totalViolacoes = await _context.UsoInadequadoIA.CountAsync(v => v.UsuarioId == paciente.UsuarioId) + 1;
            _context.UsoInadequadoIA.Add(new UsoInadequadoIA(paciente.UsuarioId!.Value, TipoViolacao.UsoIndevido, sintomas));

            if (totalViolacoes == 2)
            {
                paciente.Usuario.BloquearIA(DateTime.UtcNow.AddDays(1));
            }
            else if (totalViolacoes >= 3)
            {
                paciente.Usuario.BloquearIA(DateTime.UtcNow.AddDays(7));
            }

            var notificacoes = new List<Notificacao>();
            var admins = await _context.Usuarios.AsNoTracking().Where(u => u.Role == RoleUsuario.Admin).ToListAsync();
            foreach (var admin in admins)
            {
                var notificacao = new Notificacao(
                    admin.Id,
                    "Uso Indevido da IA",
                    $"O paciente {paciente.Pessoa?.Nome} (CPF: {paciente.Pessoa?.Cpf}) enviou sintomas irrelevantes à saúde: \"{sintomas}\".",
                    link: $"violacoes?busca={paciente.Pessoa?.Cpf}"
                );
                _context.Notificacoes.Add(notificacao);
                notificacoes.Add(notificacao);
            }

            await _context.SaveChangesAsync();
            await PushRealtimeAsync(notificacoes);

            throw new ValidationException("Seus sintomas não estão relacionados à saúde. Por favor, descreva uma queixa médica real para prosseguir.");
        }

        public async Task RemoverPenalidadeAsync(Guid usuarioId)
        {
            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) throw new NotFoundException("Usuário não encontrado.");

            if (usuario.IsBloqueado())
            {
                usuario.DesbloquearConta();
            }

            // Penalidade temporária de IA vive no LoginPortal (Fase 6).
            usuario.DesbloquearIA();

            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (paciente != null && paciente.Situacao == Situacao.Banido)
            {
                // Ban permanente por IA vira Situacao=Banido; ao perdoar, reativa a conta.
                paciente.Reativar();
            }

            // Antes o aviso ficava esperando o próximo login (flag no Paciente). Agora vira
            // uma notificação: o feed cobre o "já avisei" (Lida) e o SignalR empurra na hora.
            var notificacao = new Notificacao(
                usuarioId,
                "Penalidade removida",
                "A restrição de uso da triagem por IA foi removida pela administração. Você já pode utilizar o serviço normalmente.",
                link: "triagem");
            _context.Notificacoes.Add(notificacao);

            await _context.SaveChangesAsync();
            await _notificadorTempoReal.NotificarAsync(notificacao);
        }

        public async Task<IEnumerable<object>> ObterViolacoesAsync()
        {
            var violacoes = await _context.UsoInadequadoIA
                .AsNoTracking()
                .Include(a => a.Usuario)
                .Select(a => new
                {
                    a.Id,
                    PacienteId = a.UsuarioId,
                    // Identidade a partir da Pessoa (fonte única — Thread B); demais campos são da conta.
                    PacienteNome = a.Usuario.Pessoa!.Nome,
                    PacienteCpf = a.Usuario.Pessoa!.Cpf,
                    // Papel do autor da violação a partir do papel unificado Role (Fase A2b).
                    PacienteTipo = a.Usuario.Role == RoleUsuario.Medico ? PerfisUsuario.Medico
                                   : a.Usuario.Role == RoleUsuario.Enfermeira ? PerfisUsuario.Enfermeira
                                   : a.Usuario.Role == RoleUsuario.Admin ? "Administrador"
                                   : PerfisUsuario.Paciente,
                    PacienteFotoBase64 = a.Usuario.Foto != null ? a.Usuario.Foto.FotoBase64 : null,
                    TipoViolacao = a.TipoViolacao.ToString(),
                    a.TextoInserido,
                    a.DtCriado,
                    // Flag "avisar no login" deixou de existir (Fase 6): o aviso virou notificação.
                    // Mantido no contrato como false para não quebrar a ViolacoesList do front.
                    PenalidadeRemovidaAguardandoLogin = false,
                    IABloqueadaAte = a.Usuario.BloqueadoIAAte,
                    ContaBloqueadaAte = a.Usuario.BloqueadoAte,
                    // Ban permanente de paciente vive em Paciente.Situacao=Banido
                    // (substituiu o hack BloqueadoAte=+100 anos), então precisa vir explícito
                    // no contrato — senão a ViolacoesList não enxerga a penalidade ativa.
                    BanidoPermanente = _context.Pacientes.Any(p => p.UsuarioId == a.UsuarioId && p.Situacao == Situacao.Banido)
                })
                .OrderByDescending(a => a.DtCriado)
                .ToListAsync();

            return violacoes.Cast<object>();
        }

        public async Task<IEnumerable<object>> ObterViolacoesDebugAsync()
        {
            var violacoes = await _context.UsoInadequadoIA
                .AsNoTracking()
                .Select(a => new
                {
                    a.Id,
                    PacienteId = a.UsuarioId,
                    TipoViolacao = a.TipoViolacao.ToString(),
                    a.TextoInserido,
                    a.DtCriado
                })
                .ToListAsync();

            return violacoes.Cast<object>();
        }

        private async Task<List<Notificacao>> CancelarAgendamentosENotificarAsync(Guid usuarioId)
        {
            var notificacoesCriadas = new List<Notificacao>();

            // 1. Verificar se o usuário banido é um profissional
            var profissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (profissional != null)
            {
                var agendamentosProfissional = await _context.Agendamentos
                    .Where(a => a.ProfissionalId == profissional.Id &&
                                a.Status != StatusAgendamento.Cancelado &&
                                a.Status != StatusAgendamento.Finalizado &&
                                a.Status != StatusAgendamento.Faltou)
                    .ToListAsync();

                foreach (var agendamento in agendamentosProfissional)
                {
                    agendamento.AlterarStatus(StatusAgendamento.Cancelado);

                    var pac = await _context.Pacientes.FirstOrDefaultAsync(p => p.Id == agendamento.PacienteId);
                    if (pac != null)
                    {
                        var notificacao = new Notificacao(
                            pac.UsuarioId!.Value,
                            "Agendamento Cancelado",
                            "Seu agendamento foi cancelado devido a reajustes cadastrais administrativos do profissional.",
                            agendamento.Id,
                            link: $"aviso-cancelamento-banimento?agendamentoId={agendamento.Id}"
                        );
                        _context.Notificacoes.Add(notificacao);
                        notificacoesCriadas.Add(notificacao);
                    }
                }
            }

            // 2. Verificar se o usuário banido é um paciente
            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (paciente != null)
            {
                var agendamentosPaciente = await _context.Agendamentos
                    .Where(a => a.PacienteId == paciente.Id &&
                                a.Status != StatusAgendamento.Cancelado &&
                                a.Status != StatusAgendamento.Finalizado &&
                                a.Status != StatusAgendamento.Faltou)
                    .ToListAsync();

                foreach (var agendamento in agendamentosPaciente)
                {
                    agendamento.AlterarStatus(StatusAgendamento.Cancelado);

                    var prof = await _context.Profissionais.FirstOrDefaultAsync(p => p.Id == agendamento.ProfissionalId);
                    if (prof != null)
                    {
                        var notificacao = new Notificacao(
                            prof.UsuarioId,
                            "Agendamento Cancelado",
                            "O agendamento do paciente foi cancelado devido a reajustes cadastrais administrativos do participante.",
                            agendamento.Id,
                            link: $"aviso-cancelamento-banimento?agendamentoId={agendamento.Id}"
                        );
                        _context.Notificacoes.Add(notificacao);
                        notificacoesCriadas.Add(notificacao);
                    }
                }
            }

            return notificacoesCriadas;
        }
    }
}
