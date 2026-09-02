using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Domain.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AgendamentoHistorico;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Application.Services
{
    public class AgendamentoService : IAgendamentoService
    {
        private readonly IAgendamentoRepository _repository;
        private readonly IPacienteRepository _pacienteRepository;
        private readonly IProfissionalRepository _profissionalRepository;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IProbabilidadeFaltaService _probabilidadeFaltaService;
        private readonly INotificacaoRepository _notificacaoRepository;
        private readonly IConflitoHorarioService _conflitoService;
        private readonly IDelegacaoProfissionalService _delegacaoService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;

        public AgendamentoService(
            IAgendamentoRepository repository,
            IPacienteRepository pacienteRepository,
            IProfissionalRepository profissionalRepository,
            IUsuarioRepository usuarioRepository,
            IProbabilidadeFaltaService probabilidadeFaltaService,
            INotificacaoRepository notificacaoRepository,
            IConflitoHorarioService conflitoService,
            IDelegacaoProfissionalService delegacaoService,
            IUnitOfWork unitOfWork,
            IConfiguration configuration)
        {
            _repository = repository;
            _pacienteRepository = pacienteRepository;
            _profissionalRepository = profissionalRepository;
            _usuarioRepository = usuarioRepository;
            _probabilidadeFaltaService = probabilidadeFaltaService;
            _notificacaoRepository = notificacaoRepository;
            _conflitoService = conflitoService;
            _delegacaoService = delegacaoService;
            _unitOfWork = unitOfWork;
            _configuration = configuration;
        }

        public async Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var tipoProfissional = (TipoProfissional)request.TipoProfissional;
            var tipoConsulta = (TipoConsulta)request.TipoConsulta;

            var paciente = await _pacienteRepository.ObterPorIdAsync(request.PacienteId);
            if (paciente == null || !paciente.EstaAtivo)
                throw new BusinessRuleException("Paciente inválido ou inativo.");

            bool ehProprioPaciente = paciente.UsuarioId == usuarioLogadoId;
            if (ehProprioPaciente)
            {
                var maxConsultasNoMesmoDia = int.TryParse(_configuration["AgendamentoConfig:MaxConsultasNoMesmoDia"], out int limitA) ? limitA : 2;
                var maxAgendamentosCriadosPorDia = int.TryParse(_configuration["AgendamentoConfig:MaxAgendamentosCriadosPorDia"], out int limitB) ? limitB : 3;

                var todosAgendamentosPaciente = await _repository.ObterTodosPorPacienteIdAsync(request.PacienteId);

                // 1. Limite A: Consultas no mesmo dia
                var consultasNoMesmoDia = todosAgendamentosPaciente.Count(a =>
                    a.DataHoraConsulta.Date == request.DataHoraConsulta.Date &&
                    a.Status != StatusAgendamento.Cancelado &&
                    a.Status != StatusAgendamento.Faltou);

                if (consultasNoMesmoDia >= maxConsultasNoMesmoDia)
                {
                    throw new BusinessRuleException($"Você já atingiu o limite de {maxConsultasNoMesmoDia} consultas ativas agendadas para o dia {request.DataHoraConsulta:dd/MM/yyyy}.");
                }

                // 2. Limite B: Agendamentos criados hoje (fuso local UTC-3)
                var hojeLocal = DateTime.UtcNow.AddHours(-3).Date;
                var agendamentosCriadosHoje = todosAgendamentosPaciente.Count(a =>
                    a.DtCriado.AddHours(-3).Date == hojeLocal);

                if (agendamentosCriadosHoje >= maxAgendamentosCriadosPorDia)
                {
                    throw new BusinessRuleException($"Você atingiu o limite de {maxAgendamentosCriadosPorDia} agendamentos criados por dia. Tente novamente amanhã.");
                }

                // 3. Regra de Especialidade Ativa Única
                if (request.EspecialidadeId.HasValue)
                {
                    var temEspecialidadeAtiva = todosAgendamentosPaciente.Any(a =>
                        (int?)a.EspecialidadeId == request.EspecialidadeId &&
                        a.Status != StatusAgendamento.Cancelado &&
                        a.Status != StatusAgendamento.Faltou &&
                        a.Status != StatusAgendamento.Finalizado);

                    if (temEspecialidadeAtiva)
                    {
                        var nomeEspecialidade = ((EspecialidadeMedica)request.EspecialidadeId.Value).ToString();
                        throw new BusinessRuleException($"Você já possui um agendamento ativo para a especialidade {nomeEspecialidade}. Não é permitido possuir mais de um agendamento ativo para a mesma especialidade simultaneamente.");
                    }

                    // 4. Regra de Intervalo de 60 Dias para Consultas Finalizadas
                    var sessentaDiasAtras = DateTime.UtcNow.AddHours(-3).AddDays(-60);
                    var temConsultaRecenteFinalizada = todosAgendamentosPaciente.Any(a =>
                        (int?)a.EspecialidadeId == request.EspecialidadeId &&
                        a.Status == StatusAgendamento.Finalizado &&
                        a.DataHoraConsulta >= sessentaDiasAtras);

                    if (temConsultaRecenteFinalizada)
                    {
                        var nomeEspecialidade = ((EspecialidadeMedica)request.EspecialidadeId.Value).ToString();
                        throw new BusinessRuleException($"Consulta Recente: Você realizou uma consulta de {nomeEspecialidade} há menos de 60 dias. Por razões clínicas, um novo agendamento para esta especialidade só pode ser efetuado diretamente pela equipe da clínica.");
                    }
                }
            }

            var compatibilidade = MaquinaEstadosAgendamento.ValidarCompatibilidade(tipoProfissional, tipoConsulta);
            if (!compatibilidade.EhValida)
                throw new BusinessRuleException(compatibilidade.MensagemErro!);

            if (request.DataHoraConsulta <= DateTime.UtcNow.AddHours(-3))
                throw new BusinessRuleException("Não é possível agendar em datas passadas.");

            bool temConflitoPaciente = await _conflitoService.ExisteConflitoPacienteAsync(request.PacienteId, request.DataHoraConsulta, tipoConsulta, null);
            if (temConflitoPaciente)
            {
                throw new BusinessRuleException("O paciente já possui um agendamento neste horário ou em horário conflitante.");
            }

            if (tipoConsulta == TipoConsulta.Retorno)
            {
                var possuiAguardandoRetorno = await _repository.ExisteAgendamentoDoPacienteComStatusAsync(
                    request.PacienteId, StatusAgendamento.AguardandoRetorno);

                if (!possuiAguardandoRetorno)
                    throw new BusinessRuleException("Retorno só pode ser agendado após uma consulta inicial pendente.");
            }

            Agendamento? origem = null;
            Guid profissionalDelegado;
            if (tipoConsulta == TipoConsulta.Retorno && request.AgendamentoOrigemId.HasValue)
            {
                origem = await _repository.ObterPorIdAsync(request.AgendamentoOrigemId.Value);
                if (origem == null) throw new NotFoundException("Agendamento de origem inválido.");
                
                bool temConflito = await _conflitoService.ExisteConflitoProfissionalAsync(origem.ProfissionalId, request.DataHoraConsulta, tipoConsulta, null);
                if (temConflito) {
                    throw new BusinessRuleException("O profissional responsável pela sua consulta de origem não tem disponibilidade neste horário.");
                }
                profissionalDelegado = origem.ProfissionalId;
            }
            else
            {
                profissionalDelegado = await _delegacaoService.DelegarAsync(tipoProfissional, tipoConsulta, request.DataHoraConsulta, null, request.EspecialidadeId);
            }
            
            var agendamento = new Agendamento(
                request.PacienteId,
                profissionalDelegado,
                request.DataHoraConsulta,
                tipoProfissional,
                tipoConsulta,
                request.AgendamentoOrigemId
            );
            agendamento.DefinirEspecialidade(request.EspecialidadeId);

            var (prob, _) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            agendamento.AtualizarProbabilidadeFalta(prob);

            // Criação atômica: agendamento + histórico + (atualização da origem) + notificações.
            // Se qualquer passo falhar, tudo é revertido (nada de agendamento sem histórico/notificação).
            Profissional? profissional = null;
            var profissionalNome = "N/A";

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _repository.AdicionarAsync(agendamento);

                var historico = new AgendamentoHistorico(
                    agendamento.Id,
                    TipoEventoHistorico.Criacao,
                    usuarioLogadoId,
                    statusNovo: agendamento.Status
                );
                await _repository.AdicionarHistoricoAsync(historico);

                if (tipoConsulta == TipoConsulta.Retorno && origem != null && origem.Status == StatusAgendamento.AguardandoRetorno)
                {
                    origem.AlterarStatus(StatusAgendamento.RetornoAgendado);
                    await _repository.AtualizarAsync(origem);

                    var historicoOrigem = new AgendamentoHistorico(
                        origem.Id,
                        TipoEventoHistorico.MudancaStatus,
                        usuarioLogadoId,
                        statusAnterior: StatusAgendamento.AguardandoRetorno,
                        statusNovo: StatusAgendamento.RetornoAgendado,
                        observacao: "Agendamento de retorno vinculado."
                    );
                    await _repository.AdicionarHistoricoAsync(historicoOrigem);
                }

                profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
                profissionalNome = profissional?.Pessoa?.Nome ?? "N/A";

                if (profissional != null)
                {
                    var msgProf = tipoConsulta == TipoConsulta.Retorno
                        ? $"Retorno de {paciente.Pessoa?.Nome} agendado para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}."
                        : $"Nova consulta de {paciente.Pessoa?.Nome} agendada para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}.";

                    var notifProfissional = new Notificacao(profissional.UsuarioId, "Novo Agendamento", msgProf, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notifProfissional);
                }

                {
                    var msgPac = tipoConsulta == TipoConsulta.Retorno
                        ? $"Seu retorno com {profissionalNome} foi agendado para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}."
                        : $"Sua consulta com {profissionalNome} foi agendada para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}.";

                    var notifPaciente = new Notificacao(paciente.UsuarioId!.Value, "Consulta Agendada", msgPac, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notifPaciente);
                }
            });

            var response = MapearResponse(agendamento, paciente.Pessoa?.Nome ?? "N/A", profissionalNome, paciente.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task<AgendamentoResponse> AtualizarAsync(Guid id, AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            if (request.DataHoraConsulta <= DateTime.UtcNow.AddHours(-3))
                throw new BusinessRuleException("Não é permitido reagendar para datas/horários passados.");

            bool temConflitoPaciente = await _conflitoService.ExisteConflitoPacienteAsync(agendamento.PacienteId, request.DataHoraConsulta, (TipoConsulta)request.TipoConsulta, agendamento.Id);
            if (temConflitoPaciente)
            {
                throw new BusinessRuleException("O paciente já possui um agendamento neste horário ou em horário conflitante.");
            }

            var tipoProf = (TipoProfissional)request.TipoProfissional;
            var tipoCons = (TipoConsulta)request.TipoConsulta;
            
            var profissionalDelegado = await _delegacaoService.DelegarAsync(tipoProf, tipoCons, request.DataHoraConsulta, agendamento.Id, null);
            
            agendamento.AlterarDataHora(request.DataHoraConsulta);
            var conflitoOriginal = await _conflitoService.ExisteConflitoProfissionalAsync(agendamento.ProfissionalId, request.DataHoraConsulta, tipoCons, agendamento.Id);
            if(conflitoOriginal)
            {
               throw new BusinessRuleException("O profissional original não possui agenda para esse reagendamento. Tente outro horário.");
            }

            var (prob, _) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            agendamento.AtualizarProbabilidadeFalta(prob);

            await _repository.AtualizarAsync(agendamento);

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Pessoa?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Pessoa?.Nome ?? "N/A";

            var response = MapearResponse(agendamento, pacienteNome, profissionalNome, paciente?.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task<AgendamentoResponse> AlterarStatusAsync(Guid id, int novoStatusInt, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            var novoStatus = (StatusAgendamento)novoStatusInt;
            var validacao = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, novoStatus, DateTime.UtcNow.AddHours(-3));
            if (!validacao.EhValida)
                throw new BusinessRuleException(validacao.MensagemErro!);

            var statusAntigo = agendamento.Status;
            agendamento.AlterarStatus(novoStatus);

            var tipoEvento = novoStatus == StatusAgendamento.Cancelado
                ? TipoEventoHistorico.Cancelamento
                : TipoEventoHistorico.MudancaStatus;

            // Atômico: atualização de status + histórico + notificações de cancelamento.
            Paciente? paciente = null;
            Profissional? profissional = null;

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _repository.AtualizarAsync(agendamento);

                var historico = new AgendamentoHistorico(
                    agendamento.Id,
                    tipoEvento,
                    usuarioLogadoId,
                    statusAnterior: statusAntigo,
                    statusNovo: novoStatus
                );
                await _repository.AdicionarHistoricoAsync(historico);

                paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
                profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);

                if (novoStatus == StatusAgendamento.Cancelado)
                {
                    if (paciente != null)
                    {
                        var msg = $"Sua consulta com {profissional?.Pessoa?.Nome ?? "N/A"} em {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm} foi cancelada.";
                        var notif = new Notificacao(paciente.UsuarioId!.Value,"Consulta Cancelada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                        await _notificacaoRepository.AdicionarAsync(notif);
                    }
                    if (profissional != null)
                    {
                        var msg = $"A consulta com {paciente?.Pessoa?.Nome ?? "N/A"} em {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm} foi cancelada.";
                        var notif = new Notificacao(profissional.UsuarioId, "Consulta Cancelada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                        await _notificacaoRepository.AdicionarAsync(notif);
                    }
                }
            });

            var pacienteNome = paciente?.Pessoa?.Nome ?? "N/A";
            var profissionalNome = profissional?.Pessoa?.Nome ?? "N/A";

            var response = MapearResponse(agendamento, pacienteNome, profissionalNome, paciente?.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task DeletarAsync(Guid id, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            // Soft-delete: em vez de remover fisicamente (o que apagaria a trilha de
            // auditoria via cascade), marca como Cancelado e registra o evento. O registro
            // e o histórico ficam preservados (RF09).
            if (agendamento.Status == StatusAgendamento.Cancelado)
                return; // idempotente

            var statusAntigo = agendamento.Status;
            agendamento.AlterarStatus(StatusAgendamento.Cancelado);

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _repository.AtualizarAsync(agendamento);

                var historico = new AgendamentoHistorico(
                    agendamento.Id,
                    TipoEventoHistorico.Cancelamento,
                    usuarioLogadoId,
                    statusAnterior: statusAntigo,
                    statusNovo: StatusAgendamento.Cancelado,
                    observacao: "Agendamento removido (soft-delete) — registro preservado para auditoria."
                );
                await _repository.AdicionarHistoricoAsync(historico);
            });
        }

        public async Task<AgendamentoResponse> ObterPorIdAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Pessoa?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Pessoa?.Nome ?? "N/A";

            var response = MapearResponse(agendamento, pacienteNome, profissionalNome, paciente?.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task<AgendamentoResponse> RemarcarAsync(Guid id, RemarcarAgendamentoRequest request, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            if (agendamento.Status == StatusAgendamento.Cancelado || 
                agendamento.Status == StatusAgendamento.Finalizado)
            {
                throw new BusinessRuleException("Não é possível remarcar um agendamento cancelado ou finalizado.");
            }

            if (request.NovaDataHora <= DateTime.UtcNow.AddHours(-3))
                throw new BusinessRuleException("Não é permitido remarcar para datas/horários passados.");

            var pacienteAgendamento = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            bool ehProprioPaciente = pacienteAgendamento != null && pacienteAgendamento.UsuarioId == usuarioLogadoId;
            if (ehProprioPaciente)
            {
                var maxConsultasNoMesmoDia = int.TryParse(_configuration["AgendamentoConfig:MaxConsultasNoMesmoDia"], out int limitA) ? limitA : 2;
                var todosAgendamentosPaciente = await _repository.ObterTodosPorPacienteIdAsync(agendamento.PacienteId);

                // Limite A: Consultas no mesmo dia (excluindo este próprio agendamento)
                var consultasNoMesmoDia = todosAgendamentosPaciente.Count(a =>
                    a.Id != agendamento.Id &&
                    a.DataHoraConsulta.Date == request.NovaDataHora.Date &&
                    a.Status != StatusAgendamento.Cancelado &&
                    a.Status != StatusAgendamento.Faltou);

                if (consultasNoMesmoDia >= maxConsultasNoMesmoDia)
                {
                    throw new BusinessRuleException($"Você já atingiu o limite de {maxConsultasNoMesmoDia} consultas ativas agendadas para o dia {request.NovaDataHora:dd/MM/yyyy}.");
                }

                // Validação de Especialidade Ativa Única ao remarcar (excluindo este próprio agendamento)
                if (agendamento.EspecialidadeId.HasValue)
                {
                    var temOutraEspecialidadeAtiva = todosAgendamentosPaciente.Any(a =>
                        a.Id != agendamento.Id &&
                        a.EspecialidadeId == agendamento.EspecialidadeId &&
                        a.Status != StatusAgendamento.Cancelado &&
                        a.Status != StatusAgendamento.Faltou &&
                        a.Status != StatusAgendamento.Finalizado);

                    if (temOutraEspecialidadeAtiva)
                    {
                        var nomeEspecialidade = ((EspecialidadeMedica)agendamento.EspecialidadeId.Value).ToString();
                        throw new BusinessRuleException($"Você já possui outro agendamento ativo para a especialidade {nomeEspecialidade}. Não é permitido possuir mais de um agendamento ativo para a mesma especialidade simultaneamente.");
                    }
                }
            }

            bool temConflitoPaciente = await _conflitoService.ExisteConflitoPacienteAsync(agendamento.PacienteId, request.NovaDataHora, agendamento.TipoConsulta, agendamento.Id);
            if (temConflitoPaciente)
            {
                throw new BusinessRuleException("O paciente já possui um agendamento neste horário ou em horário conflitante.");
            }

            bool temConflito = await _conflitoService.ExisteConflitoProfissionalAsync(agendamento.ProfissionalId, request.NovaDataHora, agendamento.TipoConsulta, agendamento.Id);
            if (temConflito)
            {
                throw new BusinessRuleException("O profissional responsável já possui um agendamento neste horário. Escolha outro horário.");
            }

            var dataAntiga = agendamento.DataHoraConsulta;
            agendamento.AlterarDataHora(request.NovaDataHora);

            var (prob, _) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            agendamento.AtualizarProbabilidadeFalta(prob);

            // Atômico: remarcação + histórico + notificações de paciente e profissional.
            Paciente? paciente = null;
            Profissional? profissional = null;

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _repository.AtualizarAsync(agendamento);

                var historico = new AgendamentoHistorico(
                    agendamento.Id,
                    TipoEventoHistorico.Remarcacao,
                    usuarioLogadoId,
                    dataAnterior: dataAntiga,
                    dataNova: request.NovaDataHora,
                    observacao: request.Observacao
                );
                await _repository.AdicionarHistoricoAsync(historico);

                paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
                profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);

                if (paciente != null)
                {
                    var msg = $"Sua consulta foi remarcada para {request.NovaDataHora:dd/MM/yyyy HH:mm}.";
                    var notif = new Notificacao(paciente.UsuarioId!.Value,"Consulta Remarcada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notif);
                }
                if (profissional != null)
                {
                    var msg = $"A consulta com {paciente?.Pessoa?.Nome ?? "N/A"} foi remarcada para {request.NovaDataHora:dd/MM/yyyy HH:mm}.";
                    var notif = new Notificacao(profissional.UsuarioId, "Consulta Remarcada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notif);
                }
            });

            var pacienteNome = paciente?.Pessoa?.Nome ?? "N/A";
            var profissionalNome = profissional?.Pessoa?.Nome ?? "N/A";

            var response = MapearResponse(agendamento, pacienteNome, profissionalNome, paciente?.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task<IEnumerable<AgendamentoResponse>> ObterTodosAsync()
        {
            var agendamentos = await _repository.ObterTodosAsync();
            var profissionais = await _profissionalRepository.ObterTodosAsync();

            var responses = new List<AgendamentoResponse>();

            foreach (var a in agendamentos)
            {
                var prof = profissionais.FirstOrDefault(p => p.Id == a.ProfissionalId);
                responses.Add(await MapearComProbabilidadeAsync(a, prof));
            }

            return responses;
        }

        public async Task<DTOs.PagedResult<AgendamentoResponse>> ObterTodosPaginadoAsync(int page, int pageSize, Guid? profissionalId = null, Guid? pacienteId = null, string? buscaPaciente = null, string? dataConsulta = null, string? status = null, bool riscoAltoApenas = false, string ordem = "asc")
        {
            var (items, totalCount) = await _repository.ObterTodosPaginadoAsync(page, pageSize, profissionalId, pacienteId, buscaPaciente, dataConsulta, status, riscoAltoApenas, ordem);
            var profissionais = await _profissionalRepository.ObterTodosAsync();

            var responses = new List<AgendamentoResponse>();

            foreach(var a in items)
            {
                var prof = profissionais.FirstOrDefault(p => p.Id == a.ProfissionalId);
                responses.Add(await MapearComProbabilidadeAsync(a, prof));
            }

            return new DTOs.PagedResult<AgendamentoResponse>
            {
                Items = responses,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<List<string>> ObterHorariosDisponiveisAsync(DateTime data, int tipoConsultaInt, int? especialidadeId = null, Guid? origemId = null)
        {
            var tipoConsulta = (TipoConsulta)tipoConsultaInt;
            var duracao = TipoConsultaDuracao.ObterDuracao(tipoConsulta);
            var horarios = new List<string>();

            if (data.DayOfWeek == DayOfWeek.Saturday || data.DayOfWeek == DayOfWeek.Sunday)
                return horarios;

            var inicioExpediente = new TimeSpan(8, 0, 0);
            var fimExpediente = new TimeSpan(18, 0, 0);
            var inicioAlmoco = new TimeSpan(12, 0, 0);
            var fimAlmoco = new TimeSpan(13, 0, 0);

            var horarioAtual = inicioExpediente;

            var tipoProfissionalNecessario = (tipoConsulta == TipoConsulta.ConsultaMedica || tipoConsulta == TipoConsulta.Retorno) 
                ? TipoProfissional.Medico 
                : TipoProfissional.Enfermeira;

            var profissionais = await _profissionalRepository.ObterTodosPorTipoAsync(tipoProfissionalNecessario);
            
            if (origemId.HasValue && tipoConsulta == TipoConsulta.Retorno)
            {
                var origem = await _repository.ObterPorIdAsync(origemId.Value);
                if (origem != null && origem.Status == StatusAgendamento.AguardandoRetorno)
                {
                    profissionais = profissionais.Where(p => p.Id == origem.ProfissionalId).ToList();
                }
                else
                {
                    return horarios;
                }
            }
            else if (especialidadeId.HasValue && tipoProfissionalNecessario == TipoProfissional.Medico)
            {
                profissionais = profissionais
                    .Where(p => p.Especialidades.Any(e => (int)e.EspecialidadeId == especialidadeId.Value))
                    .ToList();
            }

            if (!profissionais.Any())
                return horarios;

            while (horarioAtual.Add(TimeSpan.FromMinutes(duracao)) <= fimExpediente)
            {
                var fimSlot = horarioAtual.Add(TimeSpan.FromMinutes(duracao));

                if ((horarioAtual >= inicioAlmoco && horarioAtual < fimAlmoco) || 
                    (fimSlot > inicioAlmoco && fimSlot <= fimAlmoco) ||
                    (horarioAtual <= inicioAlmoco && fimSlot >= fimAlmoco))
                {
                    horarioAtual = horarioAtual.Add(TimeSpan.FromMinutes(duracao));
                    continue;
                }

                var dataHoraSlot = data.Date.Add(horarioAtual);

                if (dataHoraSlot <= DateTime.UtcNow.AddHours(-3))
                {
                    horarioAtual = horarioAtual.Add(TimeSpan.FromMinutes(duracao));
                    continue;
                }

                bool algumDisponivel = false;
                foreach (var prof in profissionais)
                {
                    bool temConflito = await _conflitoService.ExisteConflitoProfissionalAsync(prof.Id, dataHoraSlot, tipoConsulta, null);
                    if (!temConflito)
                    {
                        algumDisponivel = true;
                        break;
                    }
                }

                if (algumDisponivel)
                {
                    horarios.Add(horarioAtual.ToString(@"hh\:mm"));
                }

                horarioAtual = horarioAtual.Add(TimeSpan.FromMinutes(duracao));
            }

            return horarios;
        }

        public async Task<IEnumerable<AgendamentoHistoricoResponse>> ObterHistoricoAsync(Guid agendamentoId)
        {
            var historico = await _repository.ObterHistoricoPorAgendamentoAsync(agendamentoId);
            
            var responses = new List<AgendamentoHistoricoResponse>();

            foreach (var h in historico)
            {
                var nomeUsuario = await _usuarioRepository.ObterNomeUsuarioAsync(h.RealizadoPor);
                
                responses.Add(new AgendamentoHistoricoResponse
                {
                    Id = h.Id,
                    AgendamentoId = h.AgendamentoId,
                    TipoEvento = h.TipoEvento.ToString(),
                    StatusAnterior = h.StatusAnterior?.ToString(),
                    StatusNovo = h.StatusNovo?.ToString(),
                    DataAnterior = h.DataAnterior,
                    DataNova = h.DataNova,
                    Observacao = h.Observacao,
                    RealizadoPor = h.RealizadoPor,
                    NomeRealizadoPor = nomeUsuario,
                    DtCriado = h.Dt_Criado
                });
            }

            return responses;
        }

        private AgendamentoResponse MapearResponse(Agendamento a, string pacienteNome, string profissionalNome, string? pacienteFoto = null, string? profFoto = null)
        {
            return new AgendamentoResponse
            {
                Id = a.Id,
                PacienteId = a.PacienteId,
                PacienteNome = pacienteNome,
                ProfissionalId = a.ProfissionalId,
                NomeProfissional = profissionalNome,
                DataHoraConsulta = a.DataHoraConsulta,
                TipoProfissional = a.TipoProfissional.ToString(),
                TipoConsulta = a.TipoConsulta.ToString(),
                Especialidade = a.EspecialidadeId.HasValue ? ((EspecialidadeMedica)a.EspecialidadeId.Value).ToString() : "",
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId,
                ResultadoDisponivel = a.ResultadoDisponivel,
                ExigeResultadoPosterior = a.ExigeResultadoPosterior,
                ResultadoRetirado = a.ResultadoRetirado,
                DtCriado = a.DtCriado,
                PacienteFotoBase64 = pacienteFoto,
                ProfissionalFotoBase64 = profFoto
            };
        }

        // Monta a resposta completa (incluindo especialidade derivada do profissional e o
        // cálculo de probabilidade de falta) usada pelas listagens. Extraído para evitar a
        // duplicação idêntica entre ObterTodosAsync e ObterTodosPaginadoAsync.
        private async Task<AgendamentoResponse> MapearComProbabilidadeAsync(Agendamento a, Profissional? prof)
        {
            var esp = a.EspecialidadeId.HasValue
                ? ((EspecialidadeMedica)a.EspecialidadeId.Value).ToString()
                : (prof?.Especialidades.FirstOrDefault()?.EspecialidadeId.ToString() ?? "");

            var (prob, nivel) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(a.PacienteId, a.DataHoraConsulta);

            return new AgendamentoResponse
            {
                Id = a.Id,
                PacienteId = a.PacienteId,
                PacienteNome = a.Paciente?.Pessoa?.Nome ?? "N/A",
                ProfissionalId = a.ProfissionalId,
                NomeProfissional = prof?.Pessoa?.Nome ?? "N/A",
                DataHoraConsulta = a.DataHoraConsulta,
                TipoProfissional = a.TipoProfissional.ToString(),
                TipoConsulta = a.TipoConsulta.ToString(),
                Especialidade = esp,
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId,
                NivelProbabilidadeFalta = nivel,
                ProbabilidadeFalta = prob,
                ResultadoDisponivel = a.ResultadoDisponivel,
                ExigeResultadoPosterior = a.ExigeResultadoPosterior,
                ResultadoRetirado = a.ResultadoRetirado,
                DtCriado = a.DtCriado,
                PacienteFotoBase64 = a.Paciente?.Usuario?.FotoBase64,
                ProfissionalFotoBase64 = prof?.Usuario?.FotoBase64
            };
        }

        public async Task MarcarResultadoDisponivelAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            if (agendamento.TipoConsulta != TipoConsulta.Exame)
                throw new BusinessRuleException("Apenas agendamentos do tipo Exame podem ter resultado marcado.");

            if (agendamento.Status != StatusAgendamento.Finalizado)
                throw new BusinessRuleException("O exame precisa estar finalizado para marcar resultado disponível.");

            if (!agendamento.ExigeResultadoPosterior)
                throw new BusinessRuleException("Este exame não requer notificação de resultado posterior.");

            agendamento.MarcarResultadoDisponivel();
            await _repository.AtualizarAsync(agendamento);

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            if (paciente != null)
            {
                var notif = new Notificacao(
                    paciente.UsuarioId!.Value,
                    "Resultado de Exame",
                    $"O resultado do seu exame de {agendamento.DataHoraConsulta:dd/MM/yyyy} já está disponível para retirada.", 
                    agendamento.Id,
                    link: $"agendamentos?id={agendamento.Id}");
                await _notificacaoRepository.AdicionarAsync(notif);
            }
        }

        public async Task MarcarResultadoRetiradoAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            if (!agendamento.ExigeResultadoPosterior)
                throw new BusinessRuleException("Este exame não possui controle de resultado.");

            if (!agendamento.ResultadoDisponivel)
                throw new BusinessRuleException("O resultado ainda não foi marcado como disponível.");

            agendamento.MarcarResultadoRetirado();
            await _repository.AtualizarAsync(agendamento);
        }

        public async Task ConcluirExameAsync(Guid id, bool exigeResultadoPosterior, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            if (agendamento.TipoConsulta != TipoConsulta.Exame)
                throw new BusinessRuleException("Endpoint exclusivo para exames.");

            var validacao = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.Finalizado, DateTime.UtcNow.AddHours(-3));
            if (!validacao.EhValida)
                throw new BusinessRuleException(validacao.MensagemErro!);

            var statusAntigo = agendamento.Status;
            agendamento.AlterarStatus(StatusAgendamento.Finalizado);

            if (exigeResultadoPosterior)
                agendamento.ExigirResultadoPosterior();

            // Atômico: finalização do exame + histórico.
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _repository.AtualizarAsync(agendamento);

                var historico = new AgendamentoHistorico(
                    agendamento.Id,
                    TipoEventoHistorico.MudancaStatus,
                    usuarioLogadoId,
                    statusAnterior: statusAntigo,
                    statusNovo: StatusAgendamento.Finalizado,
                    observacao: exigeResultadoPosterior ? "Exame concluído — resultado posterior pendente." : null
                );
                await _repository.AdicionarHistoricoAsync(historico);
            });
        }
    }
}
