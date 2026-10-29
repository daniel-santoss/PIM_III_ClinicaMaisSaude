using ClinicaMaisSaude.Application.DTOs.Escala;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>Controle da escala 12x36: calendário do mês, detalhe do dia, visão por profissional e ausências.</summary>
    public interface IEscalaService
    {
        Task<EscalaMesResponse> ObterMesAsync(int ano, int mes);
        Task<EscalaDiaResponse> ObterDiaAsync(DateTime data, string? busca, int pagina, int tamanhoPagina);
        /// <summary>Até 10 médicos/enfermeiras ativos cujo nome contém o termo (filtro da tela).</summary>
        Task<List<ProfissionalResumo>> BuscarProfissionaisAsync(string? busca);
        Task<EscalaProfissionalResponse> ObterMesDoProfissionalAsync(Guid profissionalId, int ano, int mes);
        Task<RegistrarAusenciaResponse> RegistrarAusenciaAsync(RegistrarAusenciaRequest request, Guid registradoPor);
        Task RemoverAusenciaAsync(Guid id);
    }
}
