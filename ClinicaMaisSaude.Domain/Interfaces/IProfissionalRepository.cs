using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IProfissionalRepository
    {
        Task<IEnumerable<Profissional>> ObterTodosPorTipoAsync(TipoProfissional tipo);
        Task<Profissional?> ObterPorIdAsync(System.Guid id);
        Task<IEnumerable<Profissional>> ObterTodosAsync();

        /// <summary>Ids dos profissionais com ausência registrada no dia (agenda fechada).</summary>
        Task<HashSet<System.Guid>> ObterIdsAusentesNoDiaAsync(System.DateTime dia);
    }
}
