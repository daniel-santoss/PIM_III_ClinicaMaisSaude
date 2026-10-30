using System;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Perfil próprio: o e-mail é somente leitura (só a clínica altera, pela tela de usuários).
    public class PerfilServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly PerfilService _service;

        public PerfilServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"perfil-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new PerfilService(_context);
        }

        private async Task<Guid> CadastrarPaciente()
        {
            await new CadastroService(_context).CadastrarAsync(new CadastroRequest
            {
                Nome = "Maria Souza",
                Email = "maria@gmail.com",
                Cpf = "390.533.447-05",
                Senha = "Senha#123",
                TipoUsuario = PerfisUsuario.Paciente,
            });
            return _context.Usuarios.Single().Id;
        }

        [Fact]
        public async Task TrocarEmail_PeloPerfil_EhRecusado()
        {
            var usuarioId = await CadastrarPaciente();

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Paciente, null, "outro@gmail.com", null);

            Assert.NotNull(erro);
            Assert.Equal("maria@gmail.com", _context.Pessoas.Single().Email);
        }

        [Fact]
        public async Task MesmoEmail_ComOutrosDados_EhAceito()
        {
            var usuarioId = await CadastrarPaciente();

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Paciente, "Maria S. Souza", " MARIA@gmail.com ", null);

            Assert.Null(erro);
            Assert.Equal("Maria S. Souza", _context.Pessoas.Single().Nome);
        }

        public void Dispose() => _context.Dispose();
    }
}
