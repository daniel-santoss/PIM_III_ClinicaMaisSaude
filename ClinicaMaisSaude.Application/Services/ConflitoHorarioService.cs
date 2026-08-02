using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Domain.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Services
{
    public class ConflitoHorarioService : IConflitoHorarioService
    {
        private readonly IAgendamentoRepository _repository;

        public ConflitoHorarioService(IAgendamentoRepository repository)
        {
            _repository = repository;
        }

        public async Task<bool> ExisteConflitoProfissionalAsync(Guid profissionalId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId)
        {
            var novoFim = ConflitoHorario.CalcularFim(novoInicio, novaConsulta);

            // Carrega apenas os agendamentos ativos do profissional no dia (filtro no banco, aproveitando índice).
            var agendamentosDoDia = await _repository.ObterAtivosDoProfissionalNoDiaAsync(profissionalId, novoInicio, ignorarAgendamentoId);

            return agendamentosDoDia.Any(a => ConflitoHorario.HaSobreposicao(novoInicio, novoFim, a));
        }

        public async Task<bool> ExisteConflitoPacienteAsync(Guid pacienteId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId)
        {
            var novoFim = ConflitoHorario.CalcularFim(novoInicio, novaConsulta);

            // Carrega apenas os agendamentos ativos do paciente no dia (filtro no banco, aproveitando índice).
            var agendamentosDoDia = await _repository.ObterAtivosDoPacienteNoDiaAsync(pacienteId, novoInicio, ignorarAgendamentoId);

            return agendamentosDoDia.Any(a => ConflitoHorario.HaSobreposicao(novoInicio, novoFim, a));
        }
    }
}
