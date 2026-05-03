using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Entities;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IPacienteRepository
    {
        Task AdicionarAsync(Paciente paciente);
        Task<IEnumerable<Paciente>> ObterTodosAsync(string? nome = null, string? cpf = null);
        Task<Paciente?> ObterPorCpfAsync(string cpf);
        Task<Paciente?> ObterPorIdAsync(Guid id);
        Task AtualizarAsync(Paciente paciente);
        Task<(IEnumerable<Paciente> Items, int TotalCount)> ObterTodosPaginadoAsync(string? nome, string? cpf, int page, int pageSize);
    }
}