using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
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
            var pacienteExistente = await _pacienteRepository.ObterPorIdAsync(request.PacienteId);
            if (pacienteExistente == null || !pacienteExistente.Ativo)
            {
                throw new Exception("Paciente inválido ou inativo.");
            }

            // Paciente não pode agendar duas consultas no mesmo horário exato
            var possuiConflito = await _repository.ExisteAgendamentoNoHorarioAsync(request.PacienteId, request.DataHoraConsulta);
            if (possuiConflito)
            {
                throw new Exception($"O paciente {pacienteExistente.Nome} já possui um agendamento marcado para {request.DataHoraConsulta:dd/MM/yyyy HH:mm}. Conflito de horário detectado.");
            }

            var agendamento = new Agendamento(
                request.PacienteId,
                request.MedicoId,
                request.DataHoraConsulta
            );

            await _repository.AdicionarAsync(agendamento);

            return new AgendamentoResponse
            {
                Id = agendamento.Id,
                PacienteId = agendamento.PacienteId,
                PacienteNome = pacienteExistente.Nome,
                MedicoId = agendamento.MedicoId,
                DataHoraConsulta = agendamento.DataHoraConsulta,
                Status = agendamento.Status.ToString()
            };
        }

        public async Task DeletarAsync(Guid id)
        {
            var agendamento = await _repository.ObterPorIdAsync(id);
            if (agendamento == null)
            {
                throw new Exception("Agendamento não encontrado.");
            }

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
                Status = a.Status.ToString()
            });
        }
    }
}
