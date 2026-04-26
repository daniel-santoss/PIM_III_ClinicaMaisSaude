using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Services
{
    public class AgendamentoService : IAgendamentoService
    {
        private readonly IAgendamentoRepository _repository;
        private readonly IPacienteRepository _pacienteRepository;

        public AgendamentoService(IAgendamentoRepository repository, IPacienteRepository pacienteRepository)
        {
            _repository = repository;
            _pacienteRepository = pacienteRepository;
        }

        public async Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request)
        {
            var tipoProfissional = (TipoProfissional)request.TipoProfissional;
            var tipoConsulta = (TipoConsulta)request.TipoConsulta;

            var paciente = await _pacienteRepository.ObterPorIdAsync(request.PacienteId);
            if (paciente == null || !paciente.Ativo)
                throw new Exception("Paciente inválido ou inativo.");

            ValidarCriacao(tipoProfissional, tipoConsulta);

            if (request.DataHoraConsulta <= DateTime.Now)
                throw new Exception("Não é possível agendar em datas passadas.");

            var conflito = await _repository.ExisteAgendamentoNoHorarioAsync(request.MedicoId, request.DataHoraConsulta);
            if (conflito)
                throw new Exception("Profissional já possui agendamento neste horário.");

            if (tipoConsulta == TipoConsulta.Retorno)
            {
                var todos = await _repository.ObterTodosAsync();
                var possuiAguardandoRetorno = todos.Any(a =>
                    a.PacienteId == request.PacienteId &&
                    a.Status == StatusAgendamento.AguardandoRetorno);

                if (!possuiAguardandoRetorno)
                    throw new Exception("Retorno só pode ser agendado após uma consulta inicial pendente.");
            }

            var agendamento = new Agendamento(
                request.PacienteId,
                request.MedicoId,
                request.DataHoraConsulta,
                tipoProfissional,
                tipoConsulta,
                request.AgendamentoOrigemId
            );

            await _repository.AdicionarAsync(agendamento);

            if (tipoConsulta == TipoConsulta.Retorno && request.AgendamentoOrigemId.HasValue)
            {
                var origem = await _repository.ObterPorIdAsync(request.AgendamentoOrigemId.Value);
                if (origem != null && origem.Status == StatusAgendamento.AguardandoRetorno)
                {
                    origem.AlterarStatus(StatusAgendamento.RetornoAgendado);
                    await _repository.AtualizarAsync(origem);
                }
            }

            return MapearResponse(agendamento, paciente.Nome);
        }

        public async Task<AgendamentoResponse> AtualizarAsync(Guid id, AgendamentoRequest request)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            if (request.DataHoraConsulta <= DateTime.Now)
                throw new Exception("Não é permitido reagendar para datas/horários passados.");

            var conflito = await _repository.ExisteAgendamentoNoHorarioAsync(request.MedicoId, request.DataHoraConsulta);
            if (conflito)
                throw new Exception("Profissional já possui agendamento neste horário.");

            agendamento.AlterarDataHora(request.DataHoraConsulta);
            await _repository.AtualizarAsync(agendamento);

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            return MapearResponse(agendamento, pacienteNome);
        }

        public async Task<AgendamentoResponse> AlterarStatusAsync(Guid id, int novoStatusInt)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            var novoStatus = (StatusAgendamento)novoStatusInt;
            ValidarTransicao(agendamento, novoStatus);

            agendamento.AlterarStatus(novoStatus);
            await _repository.AtualizarAsync(agendamento);

            var pacienteNome = (await _pacienteRepository.ObterPorIdAsync(agendamento.PacienteId))?.Nome ?? "N/A";
            return MapearResponse(agendamento, pacienteNome);
        }

        public async Task DeletarAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new Exception("Agendamento não encontrado.");

            await _repository.DeletarAsync(agendamento);
        }

        public async Task<IEnumerable<AgendamentoResponse>> ObterTodosAsync()
        {
            var agendamentos = await _repository.ObterTodosAsync();

            return agendamentos.Select(a => new AgendamentoResponse
            {
                Id = a.Id,
                PacienteId = a.PacienteId,
                PacienteNome = a.Paciente?.Nome ?? "N/A",
                MedicoId = a.MedicoId,
                DataHoraConsulta = a.DataHoraConsulta,
                TipoProfissional = a.TipoProfissional.ToString(),
                TipoConsulta = a.TipoConsulta.ToString(),
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId
            });
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

            // Validação 2: Faltou não pode ser marcado no futuro
            if (novoStatus == StatusAgendamento.Faltou && agendamento.DataHoraConsulta > DateTime.Now)
            {
                throw new Exception("Não é possível registrar falta em agendamento futuro.");
            }
        }

        private AgendamentoResponse MapearResponse(Agendamento a, string pacienteNome)
        {
            return new AgendamentoResponse
            {
                Id = a.Id,
                PacienteId = a.PacienteId,
                PacienteNome = pacienteNome,
                MedicoId = a.MedicoId,
                DataHoraConsulta = a.DataHoraConsulta,
                TipoProfissional = a.TipoProfissional.ToString(),
                TipoConsulta = a.TipoConsulta.ToString(),
                Status = a.Status.ToString(),
                AgendamentoOrigemId = a.AgendamentoOrigemId
            };
        }
    }
}
