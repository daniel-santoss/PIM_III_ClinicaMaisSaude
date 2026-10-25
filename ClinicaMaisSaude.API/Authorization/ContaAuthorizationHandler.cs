using System;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>Conta de acesso sobre a qual uma operação administrativa é feita.</summary>
    public record ContaUsuario(Guid Id, RoleUsuario Role);

    /// <summary>Operações administrativas sobre contas de acesso.</summary>
    public static class OperacoesConta
    {
        public static readonly OperationAuthorizationRequirement RedefinirSenha = new() { Name = nameof(RedefinirSenha) };
    }

    /// <summary>
    /// Autorização baseada em recurso de contas de acesso:
    /// - Enfermeira: só redefine senha de contas de paciente (nunca de equipe ou admin).
    /// - Admin: liberado pelo <see cref="AdminSuperusuarioHandler"/>.
    /// </summary>
    public class ContaAuthorizationHandler
        : AuthorizationHandler<OperationAuthorizationRequirement, ContaUsuario>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            OperationAuthorizationRequirement requisito,
            ContaUsuario conta)
        {
            if (requisito.Name == OperacoesConta.RedefinirSenha.Name
                && context.User.TipoUsuario() == PerfisUsuario.Enfermeira
                && conta.Role == RoleUsuario.Paciente)
                context.Succeed(requisito);

            return Task.CompletedTask;
        }
    }
}
