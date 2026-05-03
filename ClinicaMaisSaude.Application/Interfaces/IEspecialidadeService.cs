using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IEspecialidadeService
    {
        List<object> ListarTodas();
        Task<List<int>> ListarDisponiveisAsync();
        Task<object?> ObterMinhasAsync(Guid profissionalId);
        Task<object?> AtualizarMinhasAsync(Guid profissionalId, List<int> especialidadeIds);
    }
}
