using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>Operações sobre a ficha de um paciente.</summary>
    public static class OperacoesPaciente
    {
        public static readonly OperationAuthorizationRequirement Ler = new() { Name = nameof(Ler) };
    }

    /// <summary>
    /// Autorização baseada em recurso da ficha do paciente:
    /// - Paciente: só a própria ficha.
    /// - Enfermeira (recepção): qualquer ficha.
    /// - Admin: liberado pelo <see cref="AdminSuperusuarioHandler"/>.
    /// </summary>
    public class PacienteAuthorizationHandler
        : AuthorizationHandler<OperationAuthorizationRequirement, PacienteResponse>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            OperationAuthorizationRequirement requisito,
            PacienteResponse paciente)
        {
            var user = context.User;
            var tipo = user.TipoUsuario();

            if (requisito.Name == OperacoesPaciente.Ler.Name)
            {
                if (tipo == PerfisUsuario.Enfermeira
                    || (tipo == PerfisUsuario.Paciente && user.PacienteId() == paciente.Id))
                    context.Succeed(requisito);
            }

            return Task.CompletedTask;
        }
    }
}
