using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Editor admin dos modelos de DS (D5) contra EF InMemory.
    public class ModeloDeclaracaoServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly ModeloDeclaracaoService _service;

        public ModeloDeclaracaoServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"modelods-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new ModeloDeclaracaoService(_context);
        }

        [Fact]
        public async Task Criar_DefinirComoPadrao_TornaUnicoPadrao()
        {
            var antigo = new ModeloDeclaracaoSaude("Antigo", modeloPadrao: true);
            _context.ModelosDeclaracaoSaude.Add(antigo);
            await _context.SaveChangesAsync();

            var novo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Novo", DefinirComoPadrao = true });

            Assert.True(novo.ModeloPadrao);
            var antigoAtualizado = await _context.ModelosDeclaracaoSaude.AsNoTracking().FirstAsync(m => m.Id == antigo.Id);
            Assert.False(antigoAtualizado.ModeloPadrao);
            Assert.Equal(1, await _context.ModelosDeclaracaoSaude.CountAsync(m => m.ModeloPadrao));
        }

        [Fact]
        public async Task Perguntas_AdicionarEditarExcluir_Funciona()
        {
            var modelo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "M" });

            var p1 = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "Fuma?" });
            var p2 = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "Bebe?" });
            Assert.Equal(1, p1.Ordem);
            Assert.Equal(2, p2.Ordem);

            await _service.EditarPerguntaAsync(p1.Id, new PerguntaRequest { Pergunta = "Fuma atualmente?" });
            await _service.ExcluirPerguntaAsync(p2.Id);

            var det = await _service.ObterModeloAsync(modelo.Id);
            Assert.Single(det!.Perguntas);
            Assert.Equal("Fuma atualmente?", det.Perguntas[0].Pergunta);
        }

        [Fact]
        public async Task Reordenar_AtualizaOrdem()
        {
            var modelo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "M" });
            var a = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "A" });
            var b = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "B" });
            var c = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "C" });

            await _service.ReordenarPerguntasAsync(modelo.Id, new List<Guid> { c.Id, a.Id, b.Id });

            var det = await _service.ObterModeloAsync(modelo.Id);
            Assert.Equal(new[] { "C", "A", "B" }, det!.Perguntas.Select(p => p.Pergunta).ToArray());
        }

        [Fact]
        public async Task DefinirPadrao_SemPerguntas_Falha()
        {
            var modelo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Vazio" });
            await Assert.ThrowsAsync<ValidationException>(() => _service.DefinirModeloPadraoAsync(modelo.Id));
        }

        [Fact]
        public async Task ModeloEmUso_TravaEdicaoDePergunta()
        {
            var modelo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Usado" });
            var p = await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "X" });
            _context.SolicitacoesCadastro.Add(new SolicitacaoCadastro(Guid.NewGuid(), modelo.Id));
            await _context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "Y" }));
            await Assert.ThrowsAsync<ValidationException>(() =>
                _service.EditarPerguntaAsync(p.Id, new PerguntaRequest { Pergunta = "Z" }));
            await Assert.ThrowsAsync<ValidationException>(() => _service.ExcluirPerguntaAsync(p.Id));
        }

        [Fact]
        public async Task Excluir_ModeloEmUsoOuPadrao_Falha()
        {
            var padrao = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Padrao" });
            await _service.AdicionarPerguntaAsync(padrao.Id, new PerguntaRequest { Pergunta = "Q" });
            await _service.DefinirModeloPadraoAsync(padrao.Id);
            await Assert.ThrowsAsync<ValidationException>(() => _service.ExcluirModeloAsync(padrao.Id));

            var usado = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Usado" });
            _context.SolicitacoesCadastro.Add(new SolicitacaoCadastro(Guid.NewGuid(), usado.Id));
            await _context.SaveChangesAsync();
            await Assert.ThrowsAsync<ValidationException>(() => _service.ExcluirModeloAsync(usado.Id));
        }

        [Fact]
        public async Task Excluir_ModeloLivre_Remove()
        {
            var modelo = await _service.CriarModeloAsync(new CriarModeloRequest { Nome = "Rascunho" });
            await _service.AdicionarPerguntaAsync(modelo.Id, new PerguntaRequest { Pergunta = "Q" });

            await _service.ExcluirModeloAsync(modelo.Id);

            Assert.Equal(0, await _context.ModelosDeclaracaoSaude.CountAsync());
            Assert.Equal(0, await _context.PerguntasDeclaracaoSaude.CountAsync());
        }

        public void Dispose() => _context.Dispose();
    }
}
