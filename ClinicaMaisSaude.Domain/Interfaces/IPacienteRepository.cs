using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Entities;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IPacienteRepository
    {
        Task AdicionarAsync(Paciente paciente);
        Task<IEnumerable<Paciente>> ObterTodosAsync();
        Task<Paciente?> ObterPorCpfAsync(string cpf);
    }
}