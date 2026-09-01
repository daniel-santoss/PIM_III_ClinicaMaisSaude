using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Primeiro acesso do auto-cadastro (D4) contra EF InMemory. Reusa o EmailFake do namespace.
    // CPF válido de teste: 39053344705.
    public class PrimeiroAcessoServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly EmailFake _email = new();
        private readonly PrimeiroAcessoService _service;

        private const string CpfProponente = "39053344705";
        private const string EmailProponente = "proponente@teste.com";

        public PrimeiroAcessoServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"primeiroacesso-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Security:CodigoRecuperacaoPepper"] = "pepper-de-teste-com-entropia-suficiente=="
                })
                .Build();
            _service = new PrimeiroAcessoService(_context, config, _email);
        }

        // Semeia um proponente (Pessoa + Paciente EmAnalise) e uma solicitação com o status dado.
        private Pessoa SemearProponente(StatusSolicitacao status = StatusSolicitacao.Aprovada)
        {
            var pessoa = new Pessoa("Proponente Teste", CpfProponente, EmailProponente, "11987654321");
            _context.Pessoas.Add(pessoa);

            var modelo = new ModeloDeclaracaoSaude("DS", modeloPadrao: true);
            _context.ModelosDeclaracaoSaude.Add(modelo);

            _context.Pacientes.Add(Paciente.NovoProponente(pessoa.Id, temProblemaMemoria: false));

            var solicitacao = new SolicitacaoCadastro(pessoa.Id, modelo.Id);
            if (status == StatusSolicitacao.Aprovada) solicitacao.Aprovar();
            else if (status == StatusSolicitacao.Recusada) solicitacao.Recusar("motivo");
            _context.SolicitacoesCadastro.Add(solicitacao);

            _context.SaveChanges();
            return pessoa;
        }

        private static string ExtrairCodigo(string corpo)
        {
            var m = Regex.Match(corpo, @">\s*([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})\s*<");
            Assert.True(m.Success, "Código não encontrado no corpo do e-mail.");
            return m.Groups[1].Value;
        }

        [Fact]
        public async Task FluxoFeliz_CriaContaEAtivaPaciente()
        {
            SemearProponente();

            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);

            var conf = await _service.ConfirmarAsync(new ConfirmarPrimeiroAcessoRequest { Cpf = CpfProponente, Codigo = codigo });
            Assert.False(string.IsNullOrWhiteSpace(conf.ResetToken));

            await _service.DefinirSenhaAsync(new DefinirSenhaPrimeiroAcessoRequest { ResetToken = conf.ResetToken, NovaSenha = "senhaForte2026" });

            var pessoa = await _context.Pessoas.FirstAsync(p => p.Cpf == CpfProponente);
            var usuario = await _context.Usuarios.SingleAsync(u => u.PessoaId == pessoa.Id);
            Assert.True(BCrypt.Net.BCrypt.Verify("senhaForte2026", usuario.SenhaHash));
            Assert.Equal(RoleUsuario.Paciente, usuario.Role);

            var paciente = await _context.Pacientes.SingleAsync(p => p.PessoaId == pessoa.Id);
            Assert.Equal(Situacao.Ativo, paciente.Situacao);
            Assert.Equal(usuario.Id, paciente.UsuarioId);

            // Código consumido (uso único).
            Assert.Equal(0, await _context.CodigosPrimeiroAcesso.CountAsync());
        }

        [Fact]
        public async Task Solicitar_SemSolicitacaoAprovada_NaoEnvia()
        {
            SemearProponente(StatusSolicitacao.EmAnalise);

            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });

            Assert.Null(_email.UltimoCorpo);
            Assert.Equal(0, await _context.CodigosPrimeiroAcesso.CountAsync());
        }

        [Fact]
        public async Task Solicitar_JaTemConta_NaoEnvia()
        {
            var pessoa = SemearProponente();
            // Simula que a conta já existe (não é caso de 1º acesso).
            _context.Usuarios.Add(new Usuario(pessoa.Id, BCrypt.Net.BCrypt.HashPassword("x12345678"), RoleUsuario.Paciente));
            await _context.SaveChangesAsync();

            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });

            Assert.Null(_email.UltimoCorpo);
            Assert.Equal(0, await _context.CodigosPrimeiroAcesso.CountAsync());
        }

        [Fact]
        public async Task Confirmar_CpfErrado_Falha()
        {
            SemearProponente();
            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ConfirmarAsync(new ConfirmarPrimeiroAcessoRequest { Cpf = "52998224725", Codigo = codigo }));
        }

        [Fact]
        public async Task Confirmar_CodigoErrado_Falha()
        {
            SemearProponente();
            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.ConfirmarAsync(new ConfirmarPrimeiroAcessoRequest { Cpf = CpfProponente, Codigo = "ZZZZZZ" }));
        }

        [Fact]
        public async Task DefinirSenha_SenhaCurta_Falha()
        {
            SemearProponente();
            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);
            var conf = await _service.ConfirmarAsync(new ConfirmarPrimeiroAcessoRequest { Cpf = CpfProponente, Codigo = codigo });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.DefinirSenhaAsync(new DefinirSenhaPrimeiroAcessoRequest { ResetToken = conf.ResetToken, NovaSenha = "curta" }));
            Assert.Equal(0, await _context.Usuarios.CountAsync());
        }

        [Fact]
        public async Task DefinirSenha_TokenReutilizado_Falha()
        {
            SemearProponente();
            await _service.SolicitarAsync(new SolicitarPrimeiroAcessoRequest { Identificador = CpfProponente });
            var codigo = ExtrairCodigo(_email.UltimoCorpo!);
            var conf = await _service.ConfirmarAsync(new ConfirmarPrimeiroAcessoRequest { Cpf = CpfProponente, Codigo = codigo });

            await _service.DefinirSenhaAsync(new DefinirSenhaPrimeiroAcessoRequest { ResetToken = conf.ResetToken, NovaSenha = "senhaForte2026" });

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.DefinirSenhaAsync(new DefinirSenhaPrimeiroAcessoRequest { ResetToken = conf.ResetToken, NovaSenha = "outraSenha2026" }));
            Assert.Equal(1, await _context.Usuarios.CountAsync());
        }

        public void Dispose() => _context.Dispose();
    }
}
