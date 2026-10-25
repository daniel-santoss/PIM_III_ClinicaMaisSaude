using System;
using System.Security.Claims;
using System.Threading.Tasks;
using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicaMaisSaude.API.Tests.Authorization
{
    public class PacienteEContaAuthorizationHandlerTests
    {
        private static readonly Guid PacienteDono = Guid.NewGuid();
        private static readonly PacienteResponse Ficha = new() { Id = PacienteDono };

        // Mesma composição da API: handlers de recurso + a regra de superusuário do admin.
        private static readonly IAuthorizationService Autorizacao = new ServiceCollection()
            .AddLogging()
            .AddAuthorization()
            .AddSingleton<IAuthorizationHandler, AdminSuperusuarioHandler>()
            .AddSingleton<IAuthorizationHandler, PacienteAuthorizationHandler>()
            .AddSingleton<IAuthorizationHandler, ContaAuthorizationHandler>()
            .BuildServiceProvider()
            .GetRequiredService<IAuthorizationService>();

        private static ClaimsPrincipal Usuario(string perfil, Guid? pacienteId = null)
        {
            var identidade = new ClaimsIdentity("Teste");
            identidade.AddClaim(new Claim(ClaimTypes.Role, perfil));
            identidade.AddClaim(new Claim(ClinicaClaims.TipoUsuario, perfil));
            if (pacienteId is not null)
                identidade.AddClaim(new Claim(ClinicaClaims.PacienteId, pacienteId.Value.ToString()));
            return new ClaimsPrincipal(identidade);
        }

        private static async Task<bool> PodeLerFicha(ClaimsPrincipal usuario) =>
            (await Autorizacao.AuthorizeAsync(usuario, Ficha, OperacoesPaciente.Ler)).Succeeded;

        private static async Task<bool> PodeRedefinirSenha(ClaimsPrincipal usuario, RoleUsuario roleDaConta) =>
            (await Autorizacao.AuthorizeAsync(usuario, new ContaUsuario(Guid.NewGuid(), roleDaConta), OperacoesConta.RedefinirSenha)).Succeeded;

        [Fact]
        public async Task Ficha_PacienteDono_PodeLer()
        {
            Assert.True(await PodeLerFicha(Usuario(PerfisUsuario.Paciente, PacienteDono)));
        }

        [Fact]
        public async Task Ficha_OutroPaciente_NaoPodeLer()
        {
            Assert.False(await PodeLerFicha(Usuario(PerfisUsuario.Paciente, Guid.NewGuid())));
        }

        [Fact]
        public async Task Ficha_Enfermeira_PodeLer()
        {
            Assert.True(await PodeLerFicha(Usuario(PerfisUsuario.Enfermeira)));
        }

        [Fact]
        public async Task Ficha_Medico_NaoPodeLer()
        {
            Assert.False(await PodeLerFicha(Usuario(PerfisUsuario.Medico)));
        }

        [Fact]
        public async Task Ficha_Admin_PodeLer()
        {
            Assert.True(await PodeLerFicha(Usuario(PerfisUsuario.Admin)));
        }

        [Fact]
        public async Task RedefinirSenha_Enfermeira_ContaDePaciente_Pode()
        {
            Assert.True(await PodeRedefinirSenha(Usuario(PerfisUsuario.Enfermeira), RoleUsuario.Paciente));
        }

        [Theory]
        [InlineData(RoleUsuario.Admin)]
        [InlineData(RoleUsuario.Medico)]
        [InlineData(RoleUsuario.Enfermeira)]
        public async Task RedefinirSenha_Enfermeira_ContaDaEquipe_NaoPode(RoleUsuario roleDaConta)
        {
            Assert.False(await PodeRedefinirSenha(Usuario(PerfisUsuario.Enfermeira), roleDaConta));
        }

        [Fact]
        public async Task RedefinirSenha_Medico_NaoPode()
        {
            Assert.False(await PodeRedefinirSenha(Usuario(PerfisUsuario.Medico), RoleUsuario.Paciente));
        }

        [Theory]
        [InlineData(RoleUsuario.Paciente)]
        [InlineData(RoleUsuario.Admin)]
        public async Task RedefinirSenha_Admin_Pode(RoleUsuario roleDaConta)
        {
            Assert.True(await PodeRedefinirSenha(Usuario(PerfisUsuario.Admin), roleDaConta));
        }
    }
}
