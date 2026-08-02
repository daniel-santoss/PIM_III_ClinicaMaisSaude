using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Tests.Fakes
{
    /// <summary>
    /// Fake em memória do IAgendamentoRepository para testes de serviço. Implementa apenas
    /// as consultas usadas pelos serviços em teste (conflito/delegação), espelhando os
    /// filtros do repositório real; os demais métodos lançam NotImplementedException para
    /// deixar explícito que não são exercitados por estes testes.
    /// </summary>
    public class FakeAgendamentoRepository : IAgendamentoRepository
    {
        public List<Agendamento> Agendamentos { get; } = new();

        private static bool Ativo(Agendamento a) =>
            a.Status != StatusAgendamento.Cancelado &&
            a.Status != StatusAgendamento.Finalizado &&
            a.Status != StatusAgendamento.Faltou;

        private static bool NoDia(Agendamento a, DateTime dia) =>
            a.DataHoraConsulta >= dia.Date && a.DataHoraConsulta < dia.Date.AddDays(1);

        public Task<IEnumerable<Agendamento>> ObterAtivosDoProfissionalNoDiaAsync(Guid profissionalId, DateTime dia, Guid? ignorarAgendamentoId)
            => Task.FromResult(Agendamentos.Where(a =>
                a.ProfissionalId == profissionalId &&
                NoDia(a, dia) &&
                Ativo(a) &&
                (ignorarAgendamentoId == null || a.Id != ignorarAgendamentoId)));

        public Task<IEnumerable<Agendamento>> ObterAtivosDoPacienteNoDiaAsync(Guid pacienteId, DateTime dia, Guid? ignorarAgendamentoId)
            => Task.FromResult(Agendamentos.Where(a =>
                a.PacienteId == pacienteId &&
                NoDia(a, dia) &&
                Ativo(a) &&
                (ignorarAgendamentoId == null || a.Id != ignorarAgendamentoId)));

        public Task<int> ContarNaoCanceladosNoDiaAsync(Guid profissionalId, DateTime dia)
            => Task.FromResult(Agendamentos.Count(a =>
                a.ProfissionalId == profissionalId &&
                NoDia(a, dia) &&
                a.Status != StatusAgendamento.Cancelado));

        public Task<int> ContarAtivosDoProfissionalAsync(Guid profissionalId)
            => Task.FromResult(Agendamentos.Count(a => a.ProfissionalId == profissionalId && Ativo(a)));

        // --- Não usados por estes testes ---
        public Task AdicionarAsync(Agendamento agendamento) => throw new NotImplementedException();
        public Task AtualizarAsync(Agendamento agendamento) => throw new NotImplementedException();
        public Task<Agendamento?> ObterPorIdAsync(Guid id) => throw new NotImplementedException();
        public Task<IEnumerable<Agendamento>> ObterTodosAsync() => throw new NotImplementedException();
        public Task<(IEnumerable<Agendamento> Items, int TotalCount)> ObterTodosPaginadoAsync(int page, int pageSize, Guid? profissionalId = null, Guid? pacienteId = null, string? buscaPaciente = null, string? dataConsulta = null, string? status = null, bool riscoAltoApenas = false, string ordem = "asc") => throw new NotImplementedException();
        public Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date) => throw new NotImplementedException();
        public Task<IEnumerable<Agendamento>> ObterTodosPorPacienteIdAsync(Guid pacienteId) => throw new NotImplementedException();
        public Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorPacienteIdAsync(Guid pacienteId) => throw new NotImplementedException();
        public Task DeletarAsync(Agendamento agendamento) => throw new NotImplementedException();
        public Task<bool> ExisteAgendamentoNoHorarioAsync(Guid profissionalId, DateTime dataHora) => throw new NotImplementedException();
        public Task AdicionarHistoricoAsync(AgendamentoHistorico historico) => throw new NotImplementedException();
        public Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorAgendamentoAsync(Guid agendamentoId) => throw new NotImplementedException();
        public Task<bool> ExisteAgendamentoDoPacienteComStatusAsync(Guid pacienteId, StatusAgendamento status) => throw new NotImplementedException();
    }
}
