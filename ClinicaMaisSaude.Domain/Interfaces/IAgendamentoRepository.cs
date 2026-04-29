using ClinicaMaisSaude.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IAgendamentoRepository
    {
        // Apenas Task -> Operações que não retornam
        Task AdicionarAsync(Agendamento agendamento);
        Task AtualizarAsync(Agendamento agendamento);

        // Task<T> -> Operações que retornam um resultado
        Task<Agendamento?> ObterPorIdAsync(Guid id);

        // IEnumerable -> Lista somente leitura
        Task<IEnumerable<Agendamento>> ObterTodosAsync();
        Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date);

        Task DeletarAsync(Agendamento agendamento);
        Task<bool> ExisteAgendamentoNoHorarioAsync(Guid profissionalId, DateTime dataHora);

        Task AdicionarHistoricoAsync(AgendamentoHistorico historico);
        Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorAgendamentoAsync(Guid agendamentoId);
    }
}
