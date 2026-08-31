using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
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
    public class AutoCadastroController : ControllerBase
    {
        private readonly IAutoCadastroService _service;

        public AutoCadastroController(IAutoCadastroService service)
        {
            _service = service;
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

        [HttpPost("solicitar")]
        [EnableRateLimiting("autocadastro")]
        public async Task<IActionResult> Solicitar([FromBody] SolicitacaoCadastroRequest request)
        {
            var resultado = await _service.SolicitarAsync(request);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        // ----------------- Fila de aprovação (ADMIN, D3) -----------------

        [HttpGet("solicitacoes")]
        [Authorize]
        public async Task<IActionResult> ListarSolicitacoes()
        {
            ExigirAdmin();
            var solicitacoes = await _service.ListarSolicitacoesEmAnaliseAsync();
            return Ok(solicitacoes);
        }

        [HttpPost("solicitacoes/{id}/aprovar")]
        [Authorize]
        public async Task<IActionResult> Aprovar(Guid id)
        {
            ExigirAdmin();
            var resultado = await _service.AprovarAsync(id);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        [HttpPost("solicitacoes/{id}/recusar")]
        [Authorize]
        public async Task<IActionResult> Recusar(Guid id, [FromBody] RecusarSolicitacaoRequest request)
        {
            ExigirAdmin();
            var resultado = await _service.RecusarAsync(id, request?.Motivo ?? string.Empty);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }

        private void ExigirAdmin()
        {
            if (!User.IsInRole(PerfisUsuario.Admin))
                throw new ForbiddenException("Apenas administradores podem gerenciar solicitações de cadastro.");
        }
    }
}
