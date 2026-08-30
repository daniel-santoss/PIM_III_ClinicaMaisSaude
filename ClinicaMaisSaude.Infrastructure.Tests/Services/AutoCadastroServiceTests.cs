using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Auto-cadastro moderado (D2) contra EF InMemory. CPF válido de teste: 39053344705.
    public class AutoCadastroServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly AutoCadastroService _service;
        private readonly ModeloDeclaracaoSaude _modelo;
        private readonly PerguntaDeclaracaoSaude _p1;
        private readonly PerguntaDeclaracaoSaude _p2;

        private const string CpfValido = "39053344705";

        public AutoCadastroServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"autocadastro-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new AutoCadastroService(_context);

            _modelo = new ModeloDeclaracaoSaude("DS Teste", modeloPadrao: true);
            _context.ModelosDeclaracaoSaude.Add(_modelo);
            _p1 = new PerguntaDeclaracaoSaude(_modelo.Id, "Tem doença crônica?", 1);
            _p2 = new PerguntaDeclaracaoSaude(_modelo.Id, "Usa medicamento contínuo?", 2);
            _context.PerguntasDeclaracaoSaude.AddRange(_p1, _p2);
            _context.SaveChanges();
        }

        private SolicitacaoCadastroRequest RequestValido() => new()
        {
            Nome = "Fulano de Tal",
            Cpf = CpfValido,
            Email = "fulano@teste.com",
            Telefone = "11987654321",
            ModeloId = _modelo.Id,
            Respostas = new List<RespostaDeclaracaoItem>
            {
                new() { PerguntaId = _p1.Id, Resposta = false },
                new() { PerguntaId = _p2.Id, Resposta = true, Detalhe = "Losartana 50mg" }
            }
        };

        [Fact]
        public async Task ObterDeclaracaoVigente_RetornaModeloPadraoComPerguntasOrdenadas()
        {
            var modelo = await _service.ObterDeclaracaoVigenteAsync();

            Assert.NotNull(modelo);
            Assert.Equal(_modelo.Id, modelo!.ModeloId);
            Assert.Equal(2, modelo.Perguntas.Count);
            Assert.Equal(1, modelo.Perguntas[0].Ordem);
        }

        [Fact]
        public async Task Solicitar_FluxoFeliz_CriaPessoaProponenteSolicitacaoERespostas()
        {
            var r = await _service.SolicitarAsync(RequestValido());

            Assert.True(r.Sucesso);
            Assert.Equal(1, await _context.Pessoas.CountAsync(p => p.Cpf == CpfValido));
            var paciente = await _context.Pacientes.SingleAsync();
            Assert.Equal(Situacao.EmAnalise, paciente.Situacao);
            Assert.Null(paciente.UsuarioId);
            var solicitacao = await _context.SolicitacoesCadastro.SingleAsync();
            Assert.Equal(StatusSolicitacao.EmAnalise, solicitacao.Status);
            Assert.Equal(2, await _context.RespostasDeclaracaoSaude.CountAsync());
        }

        [Fact]
        public async Task Solicitar_CpfInvalido_Falha()
        {
            var req = RequestValido();
            req.Cpf = "11111111111";
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
            Assert.Contains("CPF", r.Mensagem);
        }

        [Fact]
        public async Task Solicitar_RespostaSimSemDetalhe_Falha()
        {
            var req = RequestValido();
            req.Respostas = new List<RespostaDeclaracaoItem>
            {
                new() { PerguntaId = _p1.Id, Resposta = false },
                new() { PerguntaId = _p2.Id, Resposta = true, Detalhe = "   " }
            };
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
        }

        [Fact]
        public async Task Solicitar_PerguntaFaltando_Falha()
        {
            var req = RequestValido();
            req.Respostas = new List<RespostaDeclaracaoItem> { new() { PerguntaId = _p1.Id, Resposta = false } };
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
        }

        [Fact]
        public async Task Solicitar_DuasVezesMesmoCpf_SegundaFalhaPorSolicitacaoAberta()
        {
            var primeira = await _service.SolicitarAsync(RequestValido());
            Assert.True(primeira.Sucesso);

            var segunda = await _service.SolicitarAsync(RequestValido());
            Assert.False(segunda.Sucesso);
            Assert.Contains("análise", segunda.Mensagem);
        }

        public void Dispose() => _context.Dispose();
    }
}
