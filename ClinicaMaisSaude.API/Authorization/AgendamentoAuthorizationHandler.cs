using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>
    /// Autorização baseada em recurso: decide se o usuário pode executar uma operação
    /// (<see cref="OperacoesAgendamento"/>) sobre um agendamento específico.
    /// - Paciente: só o próprio agendamento, e só para ler, alterar status e remarcar.
    /// - Profissional (médico/enfermeira): qualquer operação, desde que o agendamento seja delegado a ele.
    /// - Admin: liberado pelo <see cref="AdminSuperusuarioHandler"/>, que satisfaz qualquer requisito.
    /// </summary>
    public class AgendamentoAuthorizationHandler
        : AuthorizationHandler<OperationAuthorizationRequirement, AgendamentoResponse>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            OperationAuthorizationRequirement requisito,
            AgendamentoResponse agendamento)
        {
            var user = context.User;

            if (user.TipoUsuario() == PerfisUsuario.Paciente)
            {
                var operacaoDoPaciente = requisito.Name == OperacoesAgendamento.Ler.Name
                    || requisito.Name == OperacoesAgendamento.AlterarStatus.Name
                    || requisito.Name == OperacoesAgendamento.Remarcar.Name;

                if (operacaoDoPaciente && user.PacienteId() == agendamento.PacienteId)
                    context.Succeed(requisito);
            }
            else if (user.ProfissionalId() is { } profissionalId && profissionalId == agendamento.ProfissionalId)
            {
                context.Succeed(requisito);
            }

            return Task.CompletedTask;
        }
    }
}
