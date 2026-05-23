using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IConsultaService
    {
        Task<object> SugerirTipoAsync(string sintomas, Guid? pacienteId, string? tipoUsuario, bool isAdmin, Guid usuarioLogadoId);
        Task RemoverPenalidadeAsync(Guid pacienteId);
        Task<IEnumerable<object>> ObterViolacoesAsync();
        Task<IEnumerable<object>> ObterViolacoesDebugAsync();
    }
}
