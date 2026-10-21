using ClinicaMaisSaude.Application.DTOs.Profissional;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IProfissionalService
    {
        Task<object?> ObterPorIdAsync(Guid id);
        Task<object> AtualizarAsync(Guid id, ProfissionalUpdateRequest request);
    }
}
