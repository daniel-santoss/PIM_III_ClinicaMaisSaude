using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Testes do fluxo de recuperação de senha contra um SQLite in-memory real (o serviço usa
    // ExecuteUpdate/ExecuteDelete, não suportados pelo provider EF InMemory). Um IEmailService
    // fake captura o corpo do e-mail para extrair o código gerado.
    public class RecuperacaoSenhaServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly EmailFake _email = new();
        private readonly RecuperacaoSenhaService _service;

        private const string EmailUsuario = "paciente@teste.com";
        private const string CpfUsuario = "39053344705"; // CPF matematicamente válido

        public RecuperacaoSenhaServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"recuperacao-{Guid.NewGuid()}")
                .Options;

            _context = new ClinicaDbContext(options);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Security:CodigoRecuperacaoPepper"] = "pepper-de-teste-com-entropia-suficiente=="
                })
                .Build();

            _service = new RecuperacaoSenhaService(_context, config, _email);
        }

        private Usuario SemearUsuario(string senha = "senhaAntiga1")
        {
            var usuario = new Usuario(EmailUsuario, CpfUsuario,
                BCrypt.Net.BCrypt.HashPassword(senha), "Paciente Teste", null, RoleUsuario.Paciente);
            _context.Usuarios.Add(usuario);
            _context.SaveChanges();
            return usuario;
        }

        private static string ExtrairCodigo(string corpo)
        {
            var m = Regex.Match(corpo, @">\s*([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})\s*<");
            Assert.True(m.Success, "Código não encontrado no corpo do e-mail.");
            return m.Groups[1].Value;
        }

        [Fact]
        public async Task FluxoFeliz_RedefineSenha()
        {
            var usuario = SemearUsuario();

            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);

            var resp = await _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigo });
            Assert.False(string.IsNullOrWhiteSpace(resp.ResetToken));

            await _service.RedefinirSenhaAsync(new RedefinirSenhaRequest { ResetToken = resp.ResetToken, NovaSenha = "senhaNova2026" });

            var atualizado = await _context.Usuarios.AsNoTracking().FirstAsync(u => u.Id == usuario.Id);
            Assert.True(BCrypt.Net.BCrypt.Verify("senhaNova2026", atualizado.SenhaHash));
        }

        [Fact]
        public async Task Solicitar_PorCpf_TambemFunciona()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = CpfUsuario });
            Assert.NotNull(_email.UltimoCorpo);
            Assert.Equal(1, await _context.CodigosRecuperacaoSenha.CountAsync());
        }

        [Fact]
        public async Task Solicitar_ContaInexistente_NaoLancaNemEnvia()
        {
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = "naoexiste@nada.com" });
            Assert.Null(_email.UltimoCorpo);
            Assert.Equal(0, await _context.CodigosRecuperacaoSenha.CountAsync());
        }

        [Fact]
        public async Task Validar_CodigoErrado_LancaGenerico()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });

            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = "WRONG9" }));
            Assert.Equal("Código inválido ou expirado.", ex.Message);
        }

        [Fact]
        public async Task Validar_CincoTentativasErradas_InvalidaOCodigo()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });
            var codigoCorreto = ExtrairCodigo(_email.UltimoCorpo!);

            for (int i = 0; i < 5; i++)
            {
                await Assert.ThrowsAsync<ValidationException>(() =>
                    _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = "ZZZZZZ" }));
            }

            // Após 5 erros o código é consumido: nem o código correto funciona mais.
            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigoCorreto }));
        }

        [Fact]
        public async Task Validar_CodigoUsadoUmaVez_NaoRevalida()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);

            await _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigo });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigo }));
        }

        [Fact]
        public async Task Redefinir_ResetTokenReutilizado_Falha()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);
            var resp = await _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigo });

            await _service.RedefinirSenhaAsync(new RedefinirSenhaRequest { ResetToken = resp.ResetToken, NovaSenha = "primeiraNova1" });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.RedefinirSenhaAsync(new RedefinirSenhaRequest { ResetToken = resp.ResetToken, NovaSenha = "segundaNova12" }));
        }

        [Fact]
        public async Task Redefinir_SenhaCurta_Falha()
        {
            SemearUsuario();
            await _service.SolicitarAsync(new SolicitarRecuperacaoRequest { Identificador = EmailUsuario });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);
            var resp = await _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = codigo });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.RedefinirSenhaAsync(new RedefinirSenhaRequest { ResetToken = resp.ResetToken, NovaSenha = "curta" }));
        }

        [Fact]
        public async Task Validar_CodigoExpirado_LancaGenerico()
        {
            var usuario = SemearUsuario();
            // Insere diretamente um código já expirado (o serviço filtra por DtExpiracao > agora).
            _context.CodigosRecuperacaoSenha.Add(
                new CodigoRecuperacaoSenha(usuario.Id, "deadbeef", DateTime.UtcNow.AddMinutes(-1)));
            await _context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ValidarCodigoAsync(new ValidarCodigoRequest { Identificador = EmailUsuario, Codigo = "AAAAAA" }));
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }

    // IEmailService fake: guarda o último e-mail "enviado" para os testes inspecionarem.
    internal sealed class EmailFake : IEmailService
    {
        public string? UltimoDestinatario { get; private set; }
        public string? UltimoAssunto { get; private set; }
        public string? UltimoCorpo { get; private set; }
        public string? UltimoTexto { get; private set; }

        public Task EnviarAsync(string destinatario, string assunto, string corpoHtml, string? corpoTexto = null)
        {
            UltimoDestinatario = destinatario;
            UltimoAssunto = assunto;
            UltimoCorpo = corpoHtml;
            UltimoTexto = corpoTexto;
            return Task.CompletedTask;
        }
    }
}
