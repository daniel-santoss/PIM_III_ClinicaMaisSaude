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
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Auto-cadastro moderado (D2 anônimo + D3 admin) contra EF InMemory. CPF válido de teste: 39053344705.
    public class AutoCadastroServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly EmailFake _email = new();
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
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build();
            _service = new AutoCadastroService(_context, config, _email);

            _modelo = new ModeloDeclaracaoSaude("DS Teste", modeloPadrao: true);
            _context.ModelosDeclaracaoSaude.Add(_modelo);
            _p1 = new PerguntaDeclaracaoSaude(_modelo.Id, "Tem doença crônica?", 1);
            _p2 = new PerguntaDeclaracaoSaude(_modelo.Id, "Usa medicamento contínuo?", 2);
            _context.PerguntasDeclaracaoSaude.AddRange(_p1, _p2);
            _context.SaveChanges();
        }

        private const string EmailValido = "fulano@teste.com";

        // Cada solicitação exige um token de e-mail verificado (consumido no sucesso). Semeia uma linha
        // VerificacaoEmail com o token já emitido — como se o passo de confirmação tivesse ocorrido.
        private string SemearTokenEmailVerificado(string email)
        {
            var token = CodigoVerificacaoCripto.GerarResetToken();
            var cod = CodigoVerificacao.ParaVerificacaoEmail(email.ToLowerInvariant(), "00", DateTime.UtcNow.AddMinutes(-1));
            cod.MarcarUsado();
            cod.DefinirResetToken(CodigoVerificacaoCripto.HashResetTokenHex(token), DateTime.UtcNow.AddMinutes(30));
            _context.CodigosVerificacao.Add(cod);
            _context.SaveChanges();
            return token;
        }

        private SolicitacaoCadastroRequest RequestValido() => new()
        {
            Nome = "Fulano de Tal",
            Cpf = CpfValido,
            Email = EmailValido,
            Telefone = "11987654321",
            AceiteTermos = true,
            EmailVerificadoToken = SemearTokenEmailVerificado(EmailValido),
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
            // Consentimento LGPD gravado e token de e-mail consumido (uso único).
            Assert.NotNull(solicitacao.TermosAceitosEm);
            Assert.Equal("1.0", solicitacao.TermosVersao);
            Assert.Equal(0, await _context.CodigosVerificacao.CountAsync(c => c.Tipo == TipoVerificacao.VerificacaoEmail));
        }

        [Fact]
        public async Task Solicitar_SemAceiteTermos_Falha()
        {
            var req = RequestValido();
            req.AceiteTermos = false;
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
            Assert.Contains("termos", r.Mensagem);
        }

        [Fact]
        public async Task Solicitar_SemTelefone_Falha()
        {
            var req = RequestValido();
            req.Telefone = "";
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
            Assert.Contains("telefone", r.Mensagem);
        }

        [Fact]
        public async Task Solicitar_SemTokenEmailVerificado_Falha()
        {
            var req = RequestValido();
            req.EmailVerificadoToken = "";
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
            Assert.Contains("e-mail", r.Mensagem);
        }

        [Fact]
        public async Task Solicitar_TokenDeOutroEmail_Falha()
        {
            var req = RequestValido();
            // Token válido, mas emitido para OUTRO e-mail — não pode liberar este cadastro.
            req.EmailVerificadoToken = SemearTokenEmailVerificado("outra@pessoa.com");
            var r = await _service.SolicitarAsync(req);
            Assert.False(r.Sucesso);
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

        // ----------------- Fluxo admin (D3) -----------------

        [Fact]
        public async Task Listar_TrazSolicitacaoEmAnaliseComRespostasOrdenadas()
        {
            await _service.SolicitarAsync(RequestValido());

            var fila = await _service.ListarSolicitacoesEmAnaliseAsync();

            var s = Assert.Single(fila);
            Assert.Equal("Fulano de Tal", s.Nome);
            Assert.Equal(CpfValido, s.Cpf);
            Assert.Equal(2, s.Respostas.Count);
            Assert.Equal(1, s.Respostas[0].Ordem);
            Assert.Equal("Losartana 50mg", s.Respostas[1].Detalhe);
        }

        [Fact]
        public async Task Aprovar_MudaStatusEnviaEmailEProponenteContinuaSemLogin()
        {
            await _service.SolicitarAsync(RequestValido());
            var solicitacao = await _context.SolicitacoesCadastro.SingleAsync();

            var r = await _service.AprovarAsync(solicitacao.Id);

            Assert.True(r.Sucesso);
            var atualizada = await _context.SolicitacoesCadastro.AsNoTracking().SingleAsync();
            Assert.Equal(StatusSolicitacao.Aprovada, atualizada.Status);
            Assert.NotNull(_email.UltimoCorpo);
            Assert.Equal("fulano@teste.com", _email.UltimoDestinatario);
            // Ainda sem conta e ainda EmAnalise: a ativação acontece só no 1º acesso (D4).
            var paciente = await _context.Pacientes.SingleAsync();
            Assert.Null(paciente.UsuarioId);
            Assert.Equal(Situacao.EmAnalise, paciente.Situacao);
        }

        [Fact]
        public async Task Recusar_ExigeMotivoGravaMotivoEncerraProponenteEEnviaEmail()
        {
            await _service.SolicitarAsync(RequestValido());
            var solicitacao = await _context.SolicitacoesCadastro.SingleAsync();

            var semMotivo = await _service.RecusarAsync(solicitacao.Id, "   ");
            Assert.False(semMotivo.Sucesso);

            var r = await _service.RecusarAsync(solicitacao.Id, "Dados divergentes na avaliação presencial.");
            Assert.True(r.Sucesso);

            var atualizada = await _context.SolicitacoesCadastro.AsNoTracking().SingleAsync();
            Assert.Equal(StatusSolicitacao.Recusada, atualizada.Status);
            Assert.Equal("Dados divergentes na avaliação presencial.", atualizada.MotivoRecusa);
            var paciente = await _context.Pacientes.AsNoTracking().SingleAsync();
            Assert.Equal(Situacao.Excluido, paciente.Situacao);
            Assert.Contains("Dados divergentes", _email.UltimoCorpo);
        }

        [Fact]
        public async Task Aprovar_SolicitacaoJaDecidida_Falha()
        {
            await _service.SolicitarAsync(RequestValido());
            var solicitacao = await _context.SolicitacoesCadastro.SingleAsync();
            await _service.AprovarAsync(solicitacao.Id);

            var denovo = await _service.AprovarAsync(solicitacao.Id);
            Assert.False(denovo.Sucesso);
        }

        [Fact]
        public async Task Recusar_DepoisReaplicar_ReabreProponenteEmAnalise()
        {
            await _service.SolicitarAsync(RequestValido());
            var solicitacao = await _context.SolicitacoesCadastro.SingleAsync();
            await _service.RecusarAsync(solicitacao.Id, "Reprovado na avaliação.");

            // Mesmo CPF pode solicitar de novo (Pessoa reaproveitada, perfil reaberto).
            var reaplicacao = await _service.SolicitarAsync(RequestValido());
            Assert.True(reaplicacao.Sucesso);
            Assert.Equal(1, await _context.Pessoas.CountAsync(p => p.Cpf == CpfValido));
            var paciente = await _context.Pacientes.AsNoTracking().SingleAsync();
            Assert.Equal(Situacao.EmAnalise, paciente.Situacao);
            Assert.Equal(1, await _context.SolicitacoesCadastro.CountAsync(s => s.Status == StatusSolicitacao.EmAnalise));
        }

        public void Dispose() => _context.Dispose();
    }
}
