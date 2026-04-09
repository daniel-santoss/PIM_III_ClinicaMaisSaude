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

        // Task<> -> Operações que retornam um resultado
        Task<Agendamento> ObterPorIdAsync(Guid id);

        // IEnumerable -> Lista somente leitura
        Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date);
    }
}
