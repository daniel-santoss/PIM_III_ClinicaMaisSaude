using ClinicaMaisSaude.Application.DTOs.Dashboard;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardEstatisticasDto> ObterEstatisticasAsync(DateTime dataInicio, DateTime dataFim, Guid? profissionalId, bool isAdmin, string[]? status = null, string[]? especialidades = null);
        Task<DetalhesProfissionalDto> ObterDetalhesProfissionalAsync(Guid profissionalId, DateTime dataInicio, DateTime dataFim);
        Task<byte[]> GerarExcelAsync(DateTime dataInicio, DateTime dataFim, string[]? status = null, string[]? especialidades = null, Guid? profissionalId = null, bool isAdmin = true);
        Task<byte[]> GerarPdfAsync(DateTime dataInicio, DateTime dataFim, string[]? status = null, string[]? especialidades = null, Guid? profissionalId = null, bool isAdmin = true, Guid? usuarioId = null, string role = "Usuário");
    }
}
