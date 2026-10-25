using System;
using System.Security.Claims;
using ClinicaMaisSaude.Domain.Constants;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>
    /// Leitura das claims do token (JWT) num só lugar — usada pelo
    /// <c>ClinicaControllerBase</c> e pelos handlers de autorização.
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>Tipo do usuário (claim própria), com fallback para a Role padrão.</summary>
        public static string? TipoUsuario(this ClaimsPrincipal user) =>
            user.FindFirstValue(ClinicaClaims.TipoUsuario) ?? user.FindFirstValue(ClaimTypes.Role);

        /// <summary>PacienteId vindo da claim, ou <c>null</c> se ausente/inválido.</summary>
        public static Guid? PacienteId(this ClaimsPrincipal user) =>
            Guid.TryParse(user.FindFirstValue(ClinicaClaims.PacienteId), out var id) ? id : null;

        /// <summary>ProfissionalId vindo da claim, ou <c>null</c> se ausente/inválido.</summary>
        public static Guid? ProfissionalId(this ClaimsPrincipal user) =>
            Guid.TryParse(user.FindFirstValue(ClinicaClaims.ProfissionalId), out var id) ? id : null;
    }
}
