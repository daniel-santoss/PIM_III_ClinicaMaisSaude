using ClinicaMaisSaude.Application.DTOs.Escala;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>Controle da escala 12x36: calendário do mês, detalhe do dia, visão por profissional e ausências.</summary>
    public interface IEscalaService
    {
        Task<EscalaMesResponse> ObterMesAsync(int ano, int mes);
        /// <param name="tipo">Só médicos ou só enfermeiras na lista de profissionais.</param>
        /// <param name="somenteAusentes">Só quem tem ausência no dia.</param>
        Task<EscalaDiaResponse> ObterDiaAsync(DateTime data, string? busca, int pagina, int tamanhoPagina,
            RoleUsuario? tipo = null, bool somenteAusentes = false);
        /// <summary>Até 10 médicos/enfermeiras ativos cujo nome contém o termo (filtro da tela).</summary>
        Task<List<ProfissionalResumo>> BuscarProfissionaisAsync(string? busca);
        Task<EscalaProfissionalResponse> ObterMesDoProfissionalAsync(Guid profissionalId, int ano, int mes);
        Task<RegistrarAusenciaResponse> RegistrarAusenciaAsync(RegistrarAusenciaRequest request, Guid registradoPor);
        Task RemoverAusenciaAsync(Guid id);
    }
}
