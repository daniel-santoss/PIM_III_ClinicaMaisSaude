using System;
using System.Linq;
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
    // Perfil próprio: o paciente troca o e-mail (fora do domínio da clínica, com aviso aos dois
    // endereços); médico e enfermeira não, porque o e-mail institucional é gerido pela administração.
    public class PerfilServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly AvisoContaFake _aviso = new();
        private readonly PerfilService _service;

        public PerfilServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"perfil-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new PerfilService(_context, _aviso);
        }

        private async Task<Guid> Cadastrar(string tipo, string email)
        {
            await new CadastroService(_context).CadastrarAsync(new CadastroRequest
            {
                Nome = "Maria Souza",
                Email = email,
                Cpf = "390.533.447-05",
                Senha = "Senha#123",
                TipoUsuario = tipo,
            });
            return _context.Usuarios.Single().Id;
        }

        [Fact]
        public async Task Paciente_TrocaOEmail_EAvisaOsDoisEnderecos()
        {
            var usuarioId = await Cadastrar(PerfisUsuario.Paciente, "maria@gmail.com");

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Paciente, null, " Maria.Souza@Gmail.com ", null);

            Assert.Null(erro);
            Assert.Equal("maria.souza@gmail.com", _context.Pessoas.Single().Email);
            Assert.Equal(("Maria Souza", "maria@gmail.com", "maria.souza@gmail.com"), Assert.Single(_aviso.TrocasDeEmail));
        }

        [Fact]
        public async Task Paciente_ComEmailDaClinica_EhRecusado()
        {
            var usuarioId = await Cadastrar(PerfisUsuario.Paciente, "maria@gmail.com");

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Paciente, null, "maria@clinicamaissaude.com.br", null);

            Assert.Equal(EmailInstitucional.ExclusivoDaEquipe, erro);
            Assert.Empty(_aviso.TrocasDeEmail);
        }

        [Fact]
        public async Task Enfermeira_NaoTrocaOEmailPeloPerfil()
        {
            var usuarioId = await Cadastrar(PerfisUsuario.Enfermeira, "maria@clinicamaissaude.com.br");

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Enfermeira, null, "maria.souza@clinicamaissaude.com.br", null);

            Assert.NotNull(erro);
            Assert.Equal("maria@clinicamaissaude.com.br", _context.Pessoas.Single().Email);
        }

        [Fact]
        public async Task Enfermeira_EditaOutrosDados_ComOMesmoEmail()
        {
            var usuarioId = await Cadastrar(PerfisUsuario.Enfermeira, "maria@clinicamaissaude.com.br");

            var erro = await _service.AtualizarPerfilAsync(usuarioId, PerfisUsuario.Enfermeira, "Maria S. Souza", "MARIA@clinicamaissaude.com.br", null);

            Assert.Null(erro);
            Assert.Equal("Maria S. Souza", _context.Pessoas.Single().Nome);
            Assert.Empty(_aviso.TrocasDeEmail);
        }

        public void Dispose() => _context.Dispose();
    }
}
