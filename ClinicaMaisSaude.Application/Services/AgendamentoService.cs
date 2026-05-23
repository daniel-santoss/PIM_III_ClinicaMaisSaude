using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AgendamentoHistorico;

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

        public AgendamentoService(
            IAgendamentoRepository repository, 
            IPacienteRepository pacienteRepository,
            IProfissionalRepository profissionalRepository,
            IUsuarioRepository usuarioRepository,
            IProbabilidadeFaltaService probabilidadeFaltaService,
            INotificacaoRepository notificacaoRepository)
        {
            _repository = repository;
            _pacienteRepository = pacienteRepository;
            _profissionalRepository = profissionalRepository;
            _usuarioRepository = usuarioRepository;
            _probabilidadeFaltaService = probabilidadeFaltaService;
            _notificacaoRepository = notificacaoRepository;
        }

        public async Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var tipoProfissional = (TipoProfissional)request.TipoProfissional;
            var tipoConsulta = (TipoConsulta)request.TipoConsulta;

            var paciente = await _pacienteRepository.ObterPorIdAsync(request.PacienteId);
            if (paciente == null || !paciente.Ativo)
                throw new Exception("Paciente inválido ou inativo.");

            ValidarCriacao(tipoProfissional, tipoConsulta);

            if (request.DataHoraConsulta <= DateTime.UtcNow.AddHours(-3))
                throw new Exception("Não é possível agendar em datas passadas.");

            if (tipoConsulta == TipoConsulta.Retorno)
            {
                var todosA = await _repository.ObterTodosAsync();
                var possuiAguardandoRetorno = todosA.Any(a =>
                    a.PacienteId == request.PacienteId &&
                    a.Status == StatusAgendamento.AguardandoRetorno);

                if (!possuiAguardandoRetorno)
                    throw new Exception("Retorno só pode ser agendado após uma consulta inicial pendente.");
            }

            Agendamento? origem = null;
            Guid profissionalDelegado;
            if (tipoConsulta == TipoConsulta.Retorno && request.AgendamentoOrigemId.HasValue)
            {
                origem = await _repository.ObterPorIdAsync(request.AgendamentoOrigemId.Value);
                if (origem == null) throw new Exception("Agendamento de origem inválido.");
                
                bool temConflito = await ExisteConflito(origem.ProfissionalId, request.DataHoraConsulta, tipoConsulta, null);
                if (temConflito) {
                    throw new Exception("O profissional responsável pela sua consulta de origem não tem disponibilidade neste horário.");
                }
                profissionalDelegado = origem.ProfissionalId;
            }
            else
            {
                profissionalDelegado = await DelegarProfissionalAsync(tipoProfissional, tipoConsulta, request.DataHoraConsulta, null, request.EspecialidadeId);
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

            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";
            
            if (profissional != null)
            {
                var msgProf = tipoConsulta == TipoConsulta.Retorno 
                    ? $"Retorno de {paciente.Nome} agendado para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}."
                    : $"Nova consulta de {paciente.Nome} agendada para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}.";
                
                var notifProfissional = new Notificacao(profissional.UsuarioId, "Novo Agendamento", msgProf, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                await _notificacaoRepository.AdicionarAsync(notifProfissional);
            }

            if (paciente.UsuarioId.HasValue)
            {
                var msgPac = tipoConsulta == TipoConsulta.Retorno 
                    ? $"Seu retorno com {profissionalNome} foi agendado para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}."
                    : $"Sua consulta com {profissionalNome} foi agendada para {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm}.";

                var notifPaciente = new Notificacao(paciente.UsuarioId.Value, "Consulta Agendada", msgPac, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                await _notificacaoRepository.AdicionarAsync(notifPaciente);
            }
            
            var response = MapearResponse(agendamento, paciente.Nome, profissionalNome, paciente.Usuario?.FotoBase64, profissional?.Usuario?.FotoBase64);
            var (probFinal, nivelFinal) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            response.NivelProbabilidadeFalta = nivelFinal;
            response.ProbabilidadeFalta = probFinal;

            return response;
        }

        public async Task<AgendamentoResponse> AtualizarAsync(Guid id, AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (request.DataHoraConsulta <= DateTime.UtcNow.AddHours(-3))
                throw new Exception("Não é permitido reagendar para datas/horários passados.");

            var tipoProf = (TipoProfissional)request.TipoProfissional;
            var tipoCons = (TipoConsulta)request.TipoConsulta;
            
            var profissionalDelegado = await DelegarProfissionalAsync(tipoProf, tipoCons, request.DataHoraConsulta, agendamento.Id, null);
            
            agendamento.AlterarDataHora(request.DataHoraConsulta);
            var conflitoOriginal = await ExisteConflito(agendamento.ProfissionalId, request.DataHoraConsulta, tipoCons, agendamento.Id);
            if(conflitoOriginal)
            {
               throw new Exception("O profissional original não possui agenda para esse reagendamento. Tente outro horário.");
            }

            var (prob, _) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            agendamento.AtualizarProbabilidadeFalta(prob);

            await _repository.AtualizarAsync(agendamento);

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

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
                throw new Exception("Agendamento não encontrado.");

            var novoStatus = (StatusAgendamento)novoStatusInt;
            ValidarTransicao(agendamento, novoStatus);

            var statusAntigo = agendamento.Status;
            agendamento.AlterarStatus(novoStatus);
            await _repository.AtualizarAsync(agendamento);

            var tipoEvento = novoStatus == StatusAgendamento.Cancelado 
                ? TipoEventoHistorico.Cancelamento 
                : TipoEventoHistorico.MudancaStatus;

            var historico = new AgendamentoHistorico(
                agendamento.Id,
                tipoEvento,
                usuarioLogadoId,
                statusAnterior: statusAntigo,
                statusNovo: novoStatus
            );
            await _repository.AdicionarHistoricoAsync(historico);

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

            if (novoStatus == StatusAgendamento.Cancelado)
            {
                if (paciente != null && paciente.UsuarioId.HasValue)
                {
                    var msg = $"Sua consulta com {profissionalNome} em {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm} foi cancelada.";
                    var notif = new Notificacao(paciente.UsuarioId.Value, "Consulta Cancelada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notif);
                }
                if (profissional != null)
                {
                    var msg = $"A consulta com {pacienteNome} em {agendamento.DataHoraConsulta:dd/MM/yyyy HH:mm} foi cancelada.";
                    var notif = new Notificacao(profissional.UsuarioId, "Consulta Cancelada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                    await _notificacaoRepository.AdicionarAsync(notif);
                }
            }

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
                throw new Exception("Agendamento não encontrado.");

            await _repository.DeletarAsync(agendamento);
        }

        public async Task<AgendamentoResponse> ObterPorIdAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

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
                throw new Exception("Agendamento não encontrado.");

            if (agendamento.Status == StatusAgendamento.Cancelado || 
                agendamento.Status == StatusAgendamento.Finalizado)
            {
                throw new Exception("Não é possível remarcar um agendamento cancelado ou finalizado.");
            }

            if (request.NovaDataHora <= DateTime.UtcNow.AddHours(-3))
                throw new Exception("Não é permitido remarcar para datas/horários passados.");

            bool temConflito = await ExisteConflito(agendamento.ProfissionalId, request.NovaDataHora, agendamento.TipoConsulta, agendamento.Id);
            if (temConflito)
            {
                throw new Exception("O profissional responsável já possui um agendamento neste horário. Escolha outro horário.");
            }

            var dataAntiga = agendamento.DataHoraConsulta;
            agendamento.AlterarDataHora(request.NovaDataHora);

            var (prob, _) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);
            agendamento.AtualizarProbabilidadeFalta(prob);

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

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            var pacienteNome = paciente?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

            if (paciente != null && paciente.UsuarioId.HasValue)
            {
                var msg = $"Sua consulta foi remarcada para {request.NovaDataHora:dd/MM/yyyy HH:mm}.";
                var notif = new Notificacao(paciente.UsuarioId.Value, "Consulta Remarcada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                await _notificacaoRepository.AdicionarAsync(notif);
            }
            if (profissional != null)
            {
                var msg = $"A consulta com {pacienteNome} foi remarcada para {request.NovaDataHora:dd/MM/yyyy HH:mm}.";
                var notif = new Notificacao(profissional.UsuarioId, "Consulta Remarcada", msg, agendamento.Id, link: $"agendamentos?id={agendamento.Id}");
                await _notificacaoRepository.AdicionarAsync(notif);
            }

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
            var profDict = profissionais.ToDictionary(p => p.Id, p => p.Nome);

            var responses = new List<AgendamentoResponse>();

            foreach (var a in agendamentos)
            {
                var prof = profissionais.FirstOrDefault(p => p.Id == a.ProfissionalId);
                var esp = a.EspecialidadeId.HasValue 
                    ? ((EspecialidadeMedica)a.EspecialidadeId.Value).ToString() 
                    : (prof?.Especialidades.FirstOrDefault()?.EspecialidadeId.ToString() ?? "");
                
                var (prob, nivel) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(a.PacienteId, a.DataHoraConsulta);

                responses.Add(new AgendamentoResponse
                {
                    Id = a.Id,
                    PacienteId = a.PacienteId,
                    PacienteNome = a.Paciente?.Nome ?? "N/A",
                    ProfissionalId = a.ProfissionalId,
                    NomeProfissional = prof?.Nome ?? "N/A",
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
                });
            }

            return responses;
        }

        public async Task<DTOs.PagedResult<AgendamentoResponse>> ObterTodosPaginadoAsync(int page, int pageSize, Guid? profissionalId = null, Guid? pacienteId = null, string? buscaPaciente = null, string? dataConsulta = null, string? status = null, bool riscoAltoApenas = false)
        {
            var (items, totalCount) = await _repository.ObterTodosPaginadoAsync(page, pageSize, profissionalId, pacienteId, buscaPaciente, dataConsulta, status, riscoAltoApenas);
            var profissionais = await _profissionalRepository.ObterTodosAsync();
            var profDict = profissionais.ToDictionary(p => p.Id, p => p.Nome);

            var responses = new List<AgendamentoResponse>();

            foreach(var a in items)
            {
                var prof = profissionais.FirstOrDefault(p => p.Id == a.ProfissionalId);
                var esp = a.EspecialidadeId.HasValue 
                    ? ((EspecialidadeMedica)a.EspecialidadeId.Value).ToString() 
                    : (prof?.Especialidades.FirstOrDefault()?.EspecialidadeId.ToString() ?? "");
                
                var (prob, nivel) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(a.PacienteId, a.DataHoraConsulta);

                responses.Add(new AgendamentoResponse
                {
                    Id = a.Id,
                    PacienteId = a.PacienteId,
                    PacienteNome = a.Paciente?.Nome ?? "N/A",
                    ProfissionalId = a.ProfissionalId,
                    NomeProfissional = prof?.Nome ?? "N/A",
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
                });
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
                    bool temConflito = await ExisteConflito(prof.Id, dataHoraSlot, tipoConsulta, null);
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

        private async Task<Guid> DelegarProfissionalAsync(TipoProfissional tipo, TipoConsulta consulta, DateTime escopoHorario, Guid? ignorarAgendamentoId, int? especialidadeId)
        {
            var profissionais = await _profissionalRepository.ObterTodosPorTipoAsync(tipo);
            if (!profissionais.Any())
                throw new Exception("Nenhum profissional deste tipo cadastrado no sistema.");

            // F2: Filtra por especialidade quando informada (apenas para médicos)
            if (especialidadeId.HasValue && tipo == TipoProfissional.Medico)
            {
                var comEspecialidade = profissionais
                    .Where(p => p.Especialidades.Any(e => (int)e.EspecialidadeId == especialidadeId.Value))
                    .ToList();

                if (comEspecialidade.Any())
                    profissionais = comEspecialidade;
                else
                    throw new Exception("Nenhum médico com a especialidade solicitada encontrado.");
            }

            var duracaoEmMinutos = TipoConsultaDuracao.ObterDuracao(consulta);
            var terminoPrevisto = escopoHorario.AddMinutes(duracaoEmMinutos);

            var candidatos = new List<(Guid ProfissionalId, int Cargas)>();

            foreach(var prof in profissionais)
            {
                 bool temConflito = await ExisteConflito(prof.Id, escopoHorario, consulta, ignorarAgendamentoId);
                 
                 if(!temConflito)
                 {
                     // Conta quantas sessoes ativas ele tem para balancear carga
                     var todosDeste = await _repository.ObterTodosAsync();
                     var ativos = todosDeste.Count(a => a.ProfissionalId == prof.Id && 
                            a.Status != StatusAgendamento.Cancelado && 
                            a.Status != StatusAgendamento.Finalizado &&
                            a.Status != StatusAgendamento.Faltou);

                     candidatos.Add((prof.Id, ativos));
                 }
            }

            if (!candidatos.Any())
                throw new Exception("Nenhum profissional disponível neste horário. Tente outro horário.");

            return candidatos.OrderBy(c => c.Cargas).First().ProfissionalId;
        }

        private async Task<bool> ExisteConflito(Guid profissionalId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId)
        {
             var duracaoMin = TipoConsultaDuracao.ObterDuracao(novaConsulta);
             var novoFim = novoInicio.AddMinutes(duracaoMin);

             var historicoProfissional = await _repository.ObterTodosAsync();
             
             return historicoProfissional.Any(a => 
                 a.ProfissionalId == profissionalId && 
                 a.Id != ignorarAgendamentoId &&
                 a.Status != StatusAgendamento.Cancelado &&
                 a.Status != StatusAgendamento.Finalizado &&
                 a.Status != StatusAgendamento.Faltou &&
                 (
                    (novoInicio >= a.DataHoraConsulta && novoInicio < a.DataHoraConsulta.AddMinutes(TipoConsultaDuracao.ObterDuracao(a.TipoConsulta))) ||
                    (novoFim > a.DataHoraConsulta && novoFim <= a.DataHoraConsulta.AddMinutes(TipoConsultaDuracao.ObterDuracao(a.TipoConsulta))) ||
                    (novoInicio <= a.DataHoraConsulta && novoFim >= a.DataHoraConsulta.AddMinutes(TipoConsultaDuracao.ObterDuracao(a.TipoConsulta)))
                 ));
        }

        private void ValidarCriacao(TipoProfissional tipo, TipoConsulta consulta)
        {
            var enfermeiraPode = consulta == TipoConsulta.Triagem ||
                                consulta == TipoConsulta.Exame ||
                                consulta == TipoConsulta.Vacina;

            var medicoPode = consulta == TipoConsulta.ConsultaMedica ||
                             consulta == TipoConsulta.Retorno;

            if (tipo == TipoProfissional.Enfermeira && !enfermeiraPode)
                throw new Exception("Profissional não habilitado para este tipo de consulta.");

            if (tipo == TipoProfissional.Medico && !medicoPode)
                throw new Exception("Profissional não habilitado para este tipo de consulta.");
        }

        private void ValidarTransicao(Agendamento agendamento, StatusAgendamento novoStatus)
        {
            var atual = agendamento.Status;
            var valida = false;

            switch (atual)
            {
                case StatusAgendamento.Agendado:
                    valida = novoStatus == StatusAgendamento.EmAtendimento ||
                             novoStatus == StatusAgendamento.Faltou ||
                             novoStatus == StatusAgendamento.Cancelado;
                    break;
                case StatusAgendamento.EmAtendimento:
                    valida = novoStatus == StatusAgendamento.Finalizado ||
                             (novoStatus == StatusAgendamento.AguardandoRetorno &&
                              agendamento.TipoConsulta == TipoConsulta.ConsultaMedica);
                    break;
                case StatusAgendamento.AguardandoRetorno:
                    valida = novoStatus == StatusAgendamento.RetornoAgendado;
                    break;
                case StatusAgendamento.RetornoAgendado:
                    valida = novoStatus == StatusAgendamento.Finalizado ||
                             novoStatus == StatusAgendamento.Faltou ||
                             novoStatus == StatusAgendamento.Cancelado;
                    break;
            }

            if (!valida)
            {
                if (novoStatus == StatusAgendamento.AguardandoRetorno &&
                    agendamento.TipoConsulta != TipoConsulta.ConsultaMedica)
                {
                    throw new Exception("Apenas consultas médicas podem gerar retorno.");
                }

                throw new Exception($"Transição de '{atual}' para '{novoStatus}' não é permitida.");
            }

            if (novoStatus == StatusAgendamento.EmAtendimento)
            {
                var limiteMinimo = agendamento.DataHoraConsulta.AddMinutes(-15);
                if (DateTime.UtcNow.AddHours(-3) < limiteMinimo)
                {
                    throw new Exception("Só é possível iniciar o atendimento a partir de 15 minutos antes do horário agendado.");
                }
            }

            if (novoStatus == StatusAgendamento.Faltou && agendamento.DataHoraConsulta > DateTime.UtcNow.AddHours(-3))
            {
                throw new Exception("Não é possível registrar falta em agendamento futuro.");
            }
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

        public async Task MarcarResultadoDisponivelAsync(Guid id)
        {
            var agendamento = (await _repository.ObterTodosAsync()).FirstOrDefault(a => a.Id == id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (agendamento.TipoConsulta != TipoConsulta.Exame)
                throw new Exception("Apenas agendamentos do tipo Exame podem ter resultado marcado.");

            if (agendamento.Status != StatusAgendamento.Finalizado)
                throw new Exception("O exame precisa estar finalizado para marcar resultado disponível.");

            if (!agendamento.ExigeResultadoPosterior)
                throw new Exception("Este exame não requer notificação de resultado posterior.");

            agendamento.MarcarResultadoDisponivel();
            await _repository.AtualizarAsync(agendamento);

            var paciente = await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId);
            if (paciente != null && paciente.UsuarioId.HasValue)
            {
                var notif = new Notificacao(
                    paciente.UsuarioId.Value, 
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
                throw new Exception("Agendamento não encontrado.");

            if (!agendamento.ExigeResultadoPosterior)
                throw new Exception("Este exame não possui controle de resultado.");

            if (!agendamento.ResultadoDisponivel)
                throw new Exception("O resultado ainda não foi marcado como disponível.");

            agendamento.MarcarResultadoRetirado();
            await _repository.AtualizarAsync(agendamento);
        }

        public async Task ConcluirExameAsync(Guid id, bool exigeResultadoPosterior, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (agendamento.TipoConsulta != TipoConsulta.Exame)
                throw new Exception("Endpoint exclusivo para exames.");

            ValidarTransicao(agendamento, StatusAgendamento.Finalizado);

            var statusAntigo = agendamento.Status;
            agendamento.AlterarStatus(StatusAgendamento.Finalizado);

            if (exigeResultadoPosterior)
                agendamento.ExigirResultadoPosterior();

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
        }
    }
}
