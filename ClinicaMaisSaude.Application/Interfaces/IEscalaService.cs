using ClinicaMaisSaude.Application.DTOs.Escala;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>Controle da escala 12x36: calendário do mês, detalhe do dia e ausências.</summary>
    public interface IEscalaService
    {
        Task<EscalaMesResponse> ObterMesAsync(int ano, int mes);
        Task<EscalaDiaResponse> ObterDiaAsync(DateTime data);
        Task<RegistrarAusenciaResponse> RegistrarAusenciaAsync(RegistrarAusenciaRequest request, Guid registradoPor);
        Task RemoverAusenciaAsync(Guid id);
    }
}
