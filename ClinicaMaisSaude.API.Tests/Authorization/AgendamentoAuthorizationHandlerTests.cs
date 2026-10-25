using System;
using System.Security.Claims;
using System.Threading.Tasks;
using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicaMaisSaude.API.Tests.Authorization
{
    public class AgendamentoAuthorizationHandlerTests
    {
        private static readonly Guid PacienteDono = Guid.NewGuid();
        private static readonly Guid ProfissionalDelegado = Guid.NewGuid();

        private static readonly AgendamentoResponse Agendamento = new()
        {
            Id = Guid.NewGuid(),
            PacienteId = PacienteDono,
            ProfissionalId = ProfissionalDelegado
        };

        // Mesma composição da API: o handler de recurso + a regra de superusuário do admin.
        private static readonly IAuthorizationService Autorizacao = new ServiceCollection()
            .AddLogging()
            .AddAuthorization()
            .AddSingleton<IAuthorizationHandler, AdminSuperusuarioHandler>()
            .AddSingleton<IAuthorizationHandler, AgendamentoAuthorizationHandler>()
            .BuildServiceProvider()
            .GetRequiredService<IAuthorizationService>();

        private static ClaimsPrincipal Paciente(Guid pacienteId) => Usuario(PerfisUsuario.Paciente,
            new Claim(ClinicaClaims.PacienteId, pacienteId.ToString()));

        private static ClaimsPrincipal Profissional(string perfil, Guid profissionalId) => Usuario(perfil,
            new Claim(ClinicaClaims.ProfissionalId, profissionalId.ToString()));

        private static ClaimsPrincipal Usuario(string perfil, params Claim[] extras)
        {
            var identidade = new ClaimsIdentity("Teste");
            identidade.AddClaim(new Claim(ClaimTypes.Role, perfil));
            identidade.AddClaim(new Claim(ClinicaClaims.TipoUsuario, perfil));
            identidade.AddClaims(extras);
            return new ClaimsPrincipal(identidade);
        }

        private static async Task<bool> Pode(ClaimsPrincipal usuario, OperationAuthorizationRequirement operacao) =>
            (await Autorizacao.AuthorizeAsync(usuario, Agendamento, operacao)).Succeeded;

        public static TheoryData<OperationAuthorizationRequirement> OperacoesDoPaciente => new()
        {
            OperacoesAgendamento.Ler, OperacoesAgendamento.AlterarStatus, OperacoesAgendamento.Remarcar
        };

        public static TheoryData<OperationAuthorizationRequirement> OperacoesExclusivasDaEquipe => new()
        {
            OperacoesAgendamento.Gerenciar, OperacoesAgendamento.VerRisco
        };

        public static TheoryData<OperationAuthorizationRequirement> TodasAsOperacoes => new()
        {
            OperacoesAgendamento.Ler, OperacoesAgendamento.AlterarStatus, OperacoesAgendamento.Remarcar,
            OperacoesAgendamento.Gerenciar, OperacoesAgendamento.VerRisco
        };

        [Theory]
        [MemberData(nameof(OperacoesDoPaciente))]
        public async Task PacienteDono_PodeOperacoesDoPaciente(OperationAuthorizationRequirement operacao)
        {
            Assert.True(await Pode(Paciente(PacienteDono), operacao));
        }

        [Theory]
        [MemberData(nameof(OperacoesExclusivasDaEquipe))]
        public async Task PacienteDono_NaoPodeOperacoesDaEquipe(OperationAuthorizationRequirement operacao)
        {
            Assert.False(await Pode(Paciente(PacienteDono), operacao));
        }

        [Theory]
        [MemberData(nameof(TodasAsOperacoes))]
        public async Task OutroPaciente_NaoPodeNada(OperationAuthorizationRequirement operacao)
        {
            Assert.False(await Pode(Paciente(Guid.NewGuid()), operacao));
        }

        [Theory]
        [MemberData(nameof(TodasAsOperacoes))]
        public async Task ProfissionalDelegado_PodeTudo(OperationAuthorizationRequirement operacao)
        {
            Assert.True(await Pode(Profissional(PerfisUsuario.Medico, ProfissionalDelegado), operacao));
        }

        [Theory]
        [MemberData(nameof(TodasAsOperacoes))]
        public async Task EnfermeiraNaoDelegada_NaoPodeNada(OperationAuthorizationRequirement operacao)
        {
            Assert.False(await Pode(Profissional(PerfisUsuario.Enfermeira, Guid.NewGuid()), operacao));
        }

        [Theory]
        [MemberData(nameof(TodasAsOperacoes))]
        public async Task Admin_PodeTudo(OperationAuthorizationRequirement operacao)
        {
            Assert.True(await Pode(Usuario(PerfisUsuario.Admin), operacao));
        }

        [Fact]
        public async Task PacienteComProfissionalIdForjado_NaoVirouProfissional()
        {
            // Um token de paciente nunca é avaliado pela regra de profissional, mesmo com a claim.
            var usuario = Usuario(PerfisUsuario.Paciente,
                new Claim(ClinicaClaims.PacienteId, Guid.NewGuid().ToString()),
                new Claim(ClinicaClaims.ProfissionalId, ProfissionalDelegado.ToString()));

            Assert.False(await Pode(usuario, OperacoesAgendamento.Gerenciar));
        }
    }
}
