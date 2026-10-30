using System;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Cadastro pelo admin: médicos e enfermeiras só entram com o e-mail institucional.
    public class CadastroServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly CadastroService _service;

        public CadastroServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"cadastro-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new CadastroService(_context);
        }

        private static CadastroRequest Pedido(string tipo, string email) => new()
        {
            Nome = "Maria Souza",
            Email = email,
            Cpf = "390.533.447-05",
            Senha = "Senha#123",
            TipoUsuario = tipo,
            Crm = tipo == PerfisUsuario.Medico ? "123456" : null,
            UfCrm = tipo == PerfisUsuario.Medico ? "SP" : null,
        };

        [Theory]
        [InlineData(PerfisUsuario.Medico)]
        [InlineData(PerfisUsuario.Enfermeira)]
        public async Task Profissional_ComEmailPessoal_EhRecusado(string tipo)
        {
            var resultado = await _service.CadastrarAsync(Pedido(tipo, "maria@gmail.com"));

            Assert.False(resultado.Sucesso);
            Assert.Equal(EmailInstitucional.Exigencia, resultado.Mensagem);
        }

        [Fact]
        public async Task Enfermeira_ComEmailInstitucional_EhCadastrada()
        {
            var resultado = await _service.CadastrarAsync(Pedido(PerfisUsuario.Enfermeira, "maria.souza@clinicamaissaude.com.br"));

            Assert.True(resultado.Sucesso);
        }

        [Fact]
        public async Task Paciente_ComEmailPessoal_EhCadastrado()
        {
            var resultado = await _service.CadastrarAsync(Pedido(PerfisUsuario.Paciente, "maria@gmail.com"));

            Assert.True(resultado.Sucesso);
        }

        public void Dispose() => _context.Dispose();
    }
}
