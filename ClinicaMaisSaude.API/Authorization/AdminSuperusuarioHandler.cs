using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>
    /// Regra central de superusuário: um usuário autenticado com o papel Admin
    /// satisfaz QUALQUER requisito de autorização (todos os [Authorize(Roles=...)]
    /// e policies). Em vez de listar "Admin" em cada endpoint, o admin passa por
    /// tudo aqui — "se for admin, libera o sistema inteiro".
    /// </summary>
    public class AdminSuperusuarioHandler : IAuthorizationHandler
    {
        public Task HandleAsync(AuthorizationHandlerContext context)
        {
            if (context.User.IsInRole(PerfisUsuario.Admin))
            {
                foreach (var requirement in context.PendingRequirements.ToArray())
                    context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
