using System.Security.Claims;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Base dos controllers autenticados. Centraliza a leitura das claims do token
    /// (JWT) para não repetir o mesmo plumbing em cada action. As propriedades que
    /// devolvem <see cref="Guid"/> não-anulável assumem que a requisição passou por
    /// <c>[Authorize]</c> (token presente); as anuláveis toleram ausência da claim.
    /// </summary>
    public abstract class ClinicaControllerBase : ControllerBase
    {
        /// <summary>Id do login (NameIdentifier). Use apenas em endpoints autenticados.</summary>
        protected Guid UsuarioLogadoId =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>Tipo do usuário (claim própria), com fallback para a Role padrão.</summary>
        protected string? TipoUsuario =>
            User.FindFirstValue(ClinicaClaims.TipoUsuario) ?? User.FindFirstValue(ClaimTypes.Role);

        protected bool IsAdmin => User.IsInRole(PerfisUsuario.Admin);

        protected bool EhPaciente => TipoUsuario == PerfisUsuario.Paciente;

        protected bool EhMedico => TipoUsuario == PerfisUsuario.Medico;

        /// <summary>PacienteId vindo da claim, ou <c>null</c> se ausente/inválido.</summary>
        protected Guid? PacienteIdToken =>
            Guid.TryParse(User.FindFirstValue(ClinicaClaims.PacienteId), out var id) ? id : null;

        /// <summary>ProfissionalId vindo da claim, ou <c>null</c> se ausente/inválido.</summary>
        protected Guid? ProfissionalIdToken =>
            Guid.TryParse(User.FindFirstValue(ClinicaClaims.ProfissionalId), out var id) ? id : null;
    }
}
