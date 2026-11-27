using System;
using System.Security.Claims;
using System.Threading.Tasks;
using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.API.Controllers;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaMaisSaude.API.Tests.Controllers
{
    public class AgendamentosControllerTests
    {
        // Só a guarda do paciente interessa aqui: ela roda antes de qualquer serviço.
        private static AgendamentosController ControllerDoPaciente()
        {
            var identidade = new ClaimsIdentity("Teste");
            identidade.AddClaim(new Claim(ClaimTypes.Role, PerfisUsuario.Paciente));
            identidade.AddClaim(new Claim(ClinicaClaims.TipoUsuario, PerfisUsuario.Paciente));
            return new AgendamentosController(null!, null!, null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identidade) }
                }
            };
        }

        [Fact]
        public async Task Paciente_PodePedirCancelamento()
        {
            // Passa pela guarda (e só depois esbarra nos serviços nulos deste teste).
            var erro = await Record.ExceptionAsync(() =>
                ControllerDoPaciente().AlterarStatus(Guid.NewGuid(), (int)StatusAgendamento.Cancelado));

            Assert.IsNotType<ForbiddenException>(erro);
        }

        [Theory]
        [InlineData(StatusAgendamento.Faltou)]
        [InlineData(StatusAgendamento.Finalizado)]
        [InlineData(StatusAgendamento.EmAtendimento)]
        public async Task Paciente_NaoPodeMudarParaOutroStatus(StatusAgendamento status)
        {
            await Assert.ThrowsAsync<ForbiddenException>(() =>
                ControllerDoPaciente().AlterarStatus(Guid.NewGuid(), (int)status));
        }
    }
}
