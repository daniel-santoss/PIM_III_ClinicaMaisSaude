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

        public AgendamentoService(
            IAgendamentoRepository repository, 
            IPacienteRepository pacienteRepository,
            IProfissionalRepository profissionalRepository,
            IUsuarioRepository usuarioRepository)
        {
            _repository = repository;
            _pacienteRepository = pacienteRepository;
            _profissionalRepository = profissionalRepository;
            _usuarioRepository = usuarioRepository;
        }

        public async Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var tipoProfissional = (TipoProfissional)request.TipoProfissional;
            var tipoConsulta = (TipoConsulta)request.TipoConsulta;

            var paciente = await _pacienteRepository.ObterPorIdAsync(request.PacienteId);
            if (paciente == null || !paciente.Ativo)
                throw new Exception("Paciente inválido ou inativo.");

            ValidarCriacao(tipoProfissional, tipoConsulta);

            if (request.DataHoraConsulta <= DateTime.Now)
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

            var profissionalDelegado = await DelegarProfissionalAsync(tipoProfissional, tipoConsulta, request.DataHoraConsulta, null);
            
            var agendamento = new Agendamento(
                request.PacienteId,
                profissionalDelegado,
                request.DataHoraConsulta,
                tipoProfissional,
                tipoConsulta,
                request.AgendamentoOrigemId
            );

            await _repository.AdicionarAsync(agendamento);

            var historico = new AgendamentoHistorico(
                agendamento.Id,
                TipoEventoHistorico.Criacao,
                usuarioLogadoId,
                statusNovo: agendamento.Status
            );
            await _repository.AdicionarHistoricoAsync(historico);

            if (tipoConsulta == TipoConsulta.Retorno && request.AgendamentoOrigemId.HasValue)
            {
                var origem = await _repository.ObterPorIdAsync(request.AgendamentoOrigemId.Value);
                if (origem != null && origem.Status == StatusAgendamento.AguardandoRetorno)
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
            }

            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";
            return MapearResponse(agendamento, paciente.Nome, profissionalNome);
        }

        public async Task<AgendamentoResponse> AtualizarAsync(Guid id, AgendamentoRequest request, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (request.DataHoraConsulta <= DateTime.Now)
                throw new Exception("Não é permitido reagendar para datas/horários passados.");

            // Na atualização, tenta remanejar dentro do mesmo perfil se o dia/hora mudou, ou mantém se não houver conflito
            var tipoProf = (TipoProfissional)request.TipoProfissional;
            var tipoCons = (TipoConsulta)request.TipoConsulta;
            
            var profissionalDelegado = await DelegarProfissionalAsync(tipoProf, tipoCons, request.DataHoraConsulta, agendamento.Id);
            
            agendamento.AlterarDataHora(request.DataHoraConsulta);
            // Aqui precisariamos atualizar o ProfissionalId caso fosse outro designado, mas deixaremos omitido no setter
            // Se necessário, uma propriedade AlterarProfissional() seria chamada aqui. Por enquando alteramos apenas dataHora.
            // Para mantermos consistencia, ignoraremos a delegação no Reagendamento sem setter, mas avisamos conflito:
            var conflitoOriginal = await ExisteConflito(agendamento.ProfissionalId, request.DataHoraConsulta, tipoCons, agendamento.Id);
            if(conflitoOriginal)
            {
               throw new Exception("O profissional original não possui agenda para esse reagendamento. Tente outro horário.");
            }

            await _repository.AtualizarAsync(agendamento);

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";
            return MapearResponse(agendamento, pacienteNome, profissionalNome);
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

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";
            return MapearResponse(agendamento, pacienteNome, profissionalNome);
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

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

            return MapearResponse(agendamento, pacienteNome, profissionalNome);
        }

        public async Task<AgendamentoResponse> RemarcarAsync(Guid id, RemarcarAgendamentoRequest request, Guid usuarioLogadoId)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (agendamento.Status == StatusAgendamento.Cancelado || 
                agendamento.Status == StatusAgendamento.Finalizado || 
                agendamento.Status == StatusAgendamento.Faltou)
            {
                throw new Exception("Não é possível remarcar um agendamento cancelado, finalizado ou com falta registrada.");
            }

            if (request.NovaDataHora <= DateTime.Now)
                throw new Exception("Não é permitido remarcar para datas/horários passados.");

            bool temConflito = await ExisteConflito(agendamento.ProfissionalId, request.NovaDataHora, agendamento.TipoConsulta, agendamento.Id);
            if (temConflito)
            {
                throw new Exception("O profissional responsável já possui um agendamento neste horário. Escolha outro horário.");
            }

            var dataAntiga = agendamento.DataHoraConsulta;
            agendamento.AlterarDataHora(request.NovaDataHora);

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

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            var profissional = await _profissionalRepository.ObterPorIdAsync(agendamento.ProfissionalId);
            var profissionalNome = profissional?.Nome ?? "N/A";

            return MapearResponse(agendamento, pacienteNome, profissionalNome);
        }

        public async Task<IEnumerable<AgendamentoResponse>> ObterTodosAsync()
        {
            var agendamentos = await _repository.ObterTodosAsync();
            var profissionais = await _profissionalRepository.ObterTodosAsync();
            var profDict = profissionais.ToDictionary(p => p.Id, p => p.Nome);

            return agendamentos.Select(a => new AgendamentoResponse
            {
                Id = a.Id,
                PacienteId = a.PacienteId,
                PacienteNome = a.Paciente?.Nome ?? "N/A",
                ProfissionalId = a.ProfissionalId,
                NomeProfissional = profDict.ContainsKey(a.ProfissionalId) ? profDict[a.ProfissionalId] : "N/A",
                DataHoraConsulta = a.DataHoraConsulta,
                TipoProfissional = a.TipoProfissional.ToString(),
                TipoConsulta = a.TipoConsulta.ToString(),
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId
            });
        }

        public async Task<List<string>> ObterHorariosDisponiveisAsync(DateTime data, int tipoConsultaInt)
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

                if (dataHoraSlot <= DateTime.Now)
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

        private async Task<Guid> DelegarProfissionalAsync(TipoProfissional tipo, TipoConsulta consulta, DateTime escopoHorario, Guid? ignorarAgendamentoId)
        {
            var profissionais = await _profissionalRepository.ObterTodosPorTipoAsync(tipo);
            if (!profissionais.Any())
                throw new Exception("Nenhum profissional deste tipo cadastrado no sistema.");

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

            // Retorna o Id do que tem menos carga
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

            // Regra: só pode iniciar atendimento 15 minutos antes do horário da consulta
            if (novoStatus == StatusAgendamento.EmAtendimento)
            {
                var limiteMinimo = agendamento.DataHoraConsulta.AddMinutes(-15);
                if (DateTime.Now < limiteMinimo)
                {
                    throw new Exception("Só é possível iniciar o atendimento a partir de 15 minutos antes do horário agendado.");
                }
            }

            if (novoStatus == StatusAgendamento.Faltou && agendamento.DataHoraConsulta > DateTime.Now)
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

        private AgendamentoResponse MapearResponse(Agendamento a, string pacienteNome, string profissionalNome)
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
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId,
                DtCriado = a.DtCriado
            };
        }
    }
}
