using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.DTOs.Profissional;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Troca de e-mail feita pela clínica: avisa o endereço antigo e o novo, sem depender do envio.
    public class AvisoContaServiceTests
    {
        private class EmailFake : IEmailService
        {
            public List<string> Destinos { get; } = new();
            public bool Falhar { get; set; }

            public Task EnviarAsync(string destinatario, string assunto, string corpoHtml, string? corpoTexto = null)
            {
                if (Falhar) throw new InvalidOperationException("SMTP fora do ar");
                Destinos.Add(destinatario);
                return Task.CompletedTask;
            }
        }

        private static AvisoContaService Criar(EmailFake email) =>
            new(email, new ConfigurationBuilder().Build(), NullLogger<AvisoContaService>.Instance);

        [Fact]
        public async Task Avisa_OEnderecoAntigo_EONovo()
        {
            var email = new EmailFake();

            await Criar(email).AvisarTrocaDeEmailAsync("Maria Souza", "maria@gmail.com", "maria.souza@gmail.com");

            Assert.Equal(new[] { "maria@gmail.com", "maria.souza@gmail.com" }, email.Destinos);
        }

        [Fact]
        public async Task FalhaNoEnvio_NaoInterrompeATroca()
        {
            var email = new EmailFake { Falhar = true };

            await Criar(email).AvisarTrocaDeEmailAsync("Maria Souza", "maria@gmail.com", "maria.souza@gmail.com");

            Assert.Empty(email.Destinos);
        }

        [Fact]
        public async Task ProfissionalService_SoAvisaQuandoOEmailMuda()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"aviso-{Guid.NewGuid()}")
                .Options;
            using var context = new ClinicaDbContext(options);
            await new CadastroService(context).CadastrarAsync(new CadastroRequest
            {
                Nome = "Maria Souza",
                Email = "maria@clinicamaissaude.com.br",
                Cpf = "390.533.447-05",
                Senha = "Senha#123",
                TipoUsuario = PerfisUsuario.Enfermeira,
            });
            var profissionalId = (await context.Profissionais.SingleAsync()).Id;
            var aviso = new AvisoContaFake();
            var service = new ProfissionalService(context, aviso);

            await service.AtualizarAsync(profissionalId, new ProfissionalUpdateRequest { Email = "MARIA@clinicamaissaude.com.br", Telefone = "11987654321" });
            await service.AtualizarAsync(profissionalId, new ProfissionalUpdateRequest { Email = "maria.souza@clinicamaissaude.com.br" });

            var troca = Assert.Single(aviso.TrocasDeEmail);
            Assert.Equal(("Maria Souza", "maria@clinicamaissaude.com.br", "maria.souza@clinicamaissaude.com.br"), troca);
        }
    }
}
