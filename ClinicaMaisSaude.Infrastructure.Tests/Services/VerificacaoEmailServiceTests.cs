using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Verificação de posse de e-mail no auto-cadastro (wizard web) contra EF InMemory. Reusa o EmailFake.
    public class VerificacaoEmailServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly EmailFake _email = new();
        private readonly VerificacaoEmailService _service;

        private const string Email = "proponente@teste.com";

        public VerificacaoEmailServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"verificacaoemail-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Security:CodigoRecuperacaoPepper"] = "pepper-de-teste-com-entropia-suficiente=="
                })
                .Build();
            _service = new VerificacaoEmailService(_context, config, _email, NullLogger<VerificacaoEmailService>.Instance);
        }

        private static string ExtrairCodigo(string corpo)
        {
            var m = Regex.Match(corpo, @">\s*([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})\s*<");
            Assert.True(m.Success, "Código não encontrado no corpo do e-mail.");
            return m.Groups[1].Value;
        }

        [Fact]
        public async Task FluxoFeliz_ConfirmaEEmiteToken()
        {
            await _service.SolicitarAsync(new SolicitarVerificacaoEmailRequest { Email = Email });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);

            var resp = await _service.ConfirmarAsync(new ConfirmarVerificacaoEmailRequest { Email = Email, Codigo = codigo });

            Assert.False(string.IsNullOrWhiteSpace(resp.Token));
            // O código foi consumido, mas a linha permanece com o token (validada no envio da solicitação).
            var codigoDb = await _context.CodigosVerificacao.AsNoTracking().FirstAsync();
            Assert.True(codigoDb.Usado);
            Assert.False(string.IsNullOrEmpty(codigoDb.ResetTokenHash));
        }

        [Fact]
        public async Task Solicitar_GeraCodigoDoTipoVerificacaoEmail()
        {
            await _service.SolicitarAsync(new SolicitarVerificacaoEmailRequest { Email = Email });

            Assert.NotNull(_email.UltimoCorpo);
            Assert.Equal(1, await _context.CodigosVerificacao.CountAsync(c => c.Tipo == TipoVerificacao.VerificacaoEmail));
        }

        [Fact]
        public async Task Solicitar_EmailInvalido_Falha()
        {
            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.SolicitarAsync(new SolicitarVerificacaoEmailRequest { Email = "sem-arroba" }));
            Assert.Null(_email.UltimoCorpo);
        }

        [Fact]
        public async Task Confirmar_CodigoErrado_Falha()
        {
            await _service.SolicitarAsync(new SolicitarVerificacaoEmailRequest { Email = Email });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ConfirmarAsync(new ConfirmarVerificacaoEmailRequest { Email = Email, Codigo = "ZZZZZZ" }));
        }

        [Fact]
        public async Task Confirmar_SemSolicitar_Falha()
        {
            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ConfirmarAsync(new ConfirmarVerificacaoEmailRequest { Email = Email, Codigo = "AAAAAA" }));
        }

        [Fact]
        public async Task Confirmar_CincoTentativasErradas_InvalidaOCodigo()
        {
            await _service.SolicitarAsync(new SolicitarVerificacaoEmailRequest { Email = Email });
            var correto = ExtrairCodigo(_email.UltimoCorpo!);

            for (int i = 0; i < 5; i++)
            {
                await Assert.ThrowsAsync<ValidationException>(() =>
                    _service.ConfirmarAsync(new ConfirmarVerificacaoEmailRequest { Email = Email, Codigo = "ZZZZZZ" }));
            }

            // Após 5 erros o código é consumido: nem o correto funciona mais.
            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ConfirmarAsync(new ConfirmarVerificacaoEmailRequest { Email = Email, Codigo = correto }));
        }

        public void Dispose() => _context.Dispose();
    }
}
