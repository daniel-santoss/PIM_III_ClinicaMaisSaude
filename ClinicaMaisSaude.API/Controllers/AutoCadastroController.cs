using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D). Endpoints ANÔNIMOS (proponente): busca a Declaração de Saúde
    /// vigente e envia o mini-cadastro + respostas (anti-fraude: dedupe por CPF + rate-limit por IP só
    /// no POST; backstop = avaliação presencial). Endpoints ADMIN (D3): fila de aprovação — listar as
    /// solicitações em análise e aprovar/recusar.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AutoCadastroController : ClinicaControllerBase
    {
        private readonly IAutoCadastroService _service;
        private readonly IPrimeiroAcessoService _primeiroAcesso;
        private readonly IVerificacaoEmailService _verificacaoEmail;

        public AutoCadastroController(IAutoCadastroService service, IPrimeiroAcessoService primeiroAcesso, IVerificacaoEmailService verificacaoEmail)
        {
            _service = service;
            _primeiroAcesso = primeiroAcesso;
            _verificacaoEmail = verificacaoEmail;
        }

        // Leitura pública do formulário (sem rate-limit: recarregar não deve punir).
        [HttpGet("declaracao")]
        public async Task<IActionResult> ObterDeclaracao()
        {
            var modelo = await _service.ObterDeclaracaoVigenteAsync();
            if (modelo == null)
                return NotFound("Nenhuma declaração de saúde configurada no momento.");
            return Ok(modelo);
        }

        // Verificação de e-mail do wizard (ANÔNIMO): confirma a posse do e-mail antes da DS.
        // Rate-limit por IP (política da recuperação) + throttle por e-mail no serviço (anti-bombing).
        [HttpPost("verificar-email/solicitar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> SolicitarVerificacaoEmail([FromBody] SolicitarVerificacaoEmailRequest request)
        {
            await _verificacaoEmail.SolicitarAsync(request);
            return Ok(new MensagemResponse { Mensagem = "Se o e-mail for válido, enviamos um código de confirmação." });
        }

        [HttpPost("verificar-email/confirmar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> ConfirmarVerificacaoEmail([FromBody] ConfirmarVerificacaoEmailRequest request)
        {
            var response = await _verificacaoEmail.ConfirmarAsync(request);
            return Ok(response);
        }

        [HttpPost("solicitar")]
        [EnableRateLimiting("autocadastro")]
        public async Task<IActionResult> Solicitar([FromBody] SolicitacaoCadastroRequest request)
        {
            var resultado = await _service.SolicitarAsync(request);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        // ----------------- Fila de aprovação, histórico e retificação (ADMIN, D3) -----------------

        /// <summary>Solicitações de um status: EmAnalise (padrão), Aprovada ou Recusada.</summary>
        [HttpGet("solicitacoes")]
        [Authorize]
        public async Task<IActionResult> ListarSolicitacoes([FromQuery] string? status, [FromQuery] string? busca,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            ExigirAdmin();
            var filtro = StatusSolicitacao.EmAnalise;
            if (!string.IsNullOrWhiteSpace(status) &&
                (!Enum.TryParse(status, ignoreCase: true, out filtro) || !Enum.IsDefined(filtro)))
                return BadRequest("Status inválido. Use EmAnalise, Aprovada ou Recusada.");
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);
            var solicitacoes = await _service.ListarSolicitacoesAsync(filtro, busca, page, pageSize);
            return Ok(solicitacoes);
        }

        [HttpPost("solicitacoes/{id}/aprovar")]
        [Authorize]
        public async Task<IActionResult> Aprovar(Guid id)
        {
            ExigirAdmin();
            var resultado = await _service.AprovarAsync(id, UsuarioLogadoId);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        [HttpPost("solicitacoes/{id}/recusar")]
        [Authorize]
        public async Task<IActionResult> Recusar(Guid id, [FromBody] RecusarSolicitacaoRequest request)
        {
            ExigirAdmin();
            var resultado = await _service.RecusarAsync(id, request?.Motivo ?? string.Empty, UsuarioLogadoId);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        /// <summary>Inverte uma decisão já tomada (Aprovada ↔ Recusada), com motivo obrigatório.</summary>
        [HttpPost("solicitacoes/{id}/retificar")]
        [Authorize]
        public async Task<IActionResult> Retificar(Guid id, [FromBody] RetificarSolicitacaoRequest request)
        {
            ExigirAdmin();
            var resultado = await _service.RetificarAsync(id, request?.Motivo ?? string.Empty, UsuarioLogadoId);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        private void ExigirAdmin()
        {
            if (!IsAdmin)
                throw new ForbiddenException("Apenas administradores podem gerenciar solicitações de cadastro.");
        }

        // ----------------- Primeiro acesso (ANÔNIMO, D4) -----------------
        // Proponente aprovado conclui o cadastro: pede o código, confirma com o CPF e define a senha.
        // Rate-limit por IP (mesma política da recuperação). Respostas de "solicitar" são genéricas.

        [HttpPost("primeiro-acesso/solicitar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> SolicitarPrimeiroAcesso([FromBody] SolicitarPrimeiroAcessoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Identificador))
                throw new ValidationException("Informe o CPF ou e-mail cadastrado.");

            await _primeiroAcesso.SolicitarAsync(request);
            return Ok(new MensagemResponse
            {
                Mensagem = "Se o cadastro estiver aprovado, enviamos um código para o e-mail cadastrado."
            });
        }

        [HttpPost("primeiro-acesso/confirmar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> ConfirmarPrimeiroAcesso([FromBody] ConfirmarPrimeiroAcessoRequest request)
        {
            var response = await _primeiroAcesso.ConfirmarAsync(request);
            return Ok(response);
        }

        [HttpPost("primeiro-acesso/definir-senha")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> DefinirSenhaPrimeiroAcesso([FromBody] DefinirSenhaPrimeiroAcessoRequest request)
        {
            await _primeiroAcesso.DefinirSenhaAsync(request);
            return Ok(new MensagemResponse { Mensagem = "Conta criada com sucesso. Você já pode fazer login." });
        }
    }
}
