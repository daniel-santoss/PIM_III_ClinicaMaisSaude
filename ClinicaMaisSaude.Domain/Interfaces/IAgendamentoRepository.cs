using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
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
        Task<(IEnumerable<Agendamento> Items, int TotalCount)> ObterTodosPaginadoAsync(int page, int pageSize, Guid? profissionalId = null, Guid? pacienteId = null, string? buscaPaciente = null, string? dataConsulta = null, string? status = null, bool riscoAltoApenas = false, string ordem = "asc");
        Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date);
        Task<IEnumerable<Agendamento>> ObterTodosPorPacienteIdAsync(Guid pacienteId);
        Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorPacienteIdAsync(Guid pacienteId);

        Task DeletarAsync(Agendamento agendamento);
        Task<bool> ExisteAgendamentoNoHorarioAsync(Guid profissionalId, DateTime dataHora);

        // --- Consultas filtradas no banco (evitam carregar a tabela inteira em memória) ---
        // Agendamentos ativos (não Cancelado/Finalizado/Faltou) de um profissional no dia informado — usado na checagem de conflito.
        Task<IEnumerable<Agendamento>> ObterAtivosDoProfissionalNoDiaAsync(Guid profissionalId, DateTime dia, Guid? ignorarAgendamentoId);
        // Agendamentos ativos de um paciente no dia informado — usado na checagem de conflito do paciente.
        Task<IEnumerable<Agendamento>> ObterAtivosDoPacienteNoDiaAsync(Guid pacienteId, DateTime dia, Guid? ignorarAgendamentoId);
        // Contagem de agendamentos não cancelados de um profissional num dia — critério primário de delegação.
        Task<int> ContarNaoCanceladosNoDiaAsync(Guid profissionalId, DateTime dia);
        // Contagem de agendamentos ativos (não Cancelado/Finalizado/Faltou) de um profissional — desempate na delegação.
        Task<int> ContarAtivosDoProfissionalAsync(Guid profissionalId);
        // Existe algum agendamento do paciente com determinado status? — usado na regra de retorno.
        Task<bool> ExisteAgendamentoDoPacienteComStatusAsync(Guid pacienteId, StatusAgendamento status);

        Task AdicionarHistoricoAsync(AgendamentoHistorico historico);
        Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorAgendamentoAsync(Guid agendamentoId);
    }
}
