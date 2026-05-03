namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IProfissionalService
    {
        Task<object?> ObterPorIdAsync(Guid id);
    }
}
