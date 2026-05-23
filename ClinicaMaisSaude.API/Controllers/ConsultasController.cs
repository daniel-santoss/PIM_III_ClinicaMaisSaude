using ClinicaMaisSaude.Application.DTOs.Consulta;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ConsultasController : ControllerBase
    {
        private readonly IConsultaService _consultaService;
        private readonly ILogger<ConsultasController> _logger;

        public ConsultasController(IConsultaService consultaService, ILogger<ConsultasController> logger)
        {
            _consultaService = consultaService;
            _logger = logger;
        }

        [HttpPost("sugerir-tipo")]
        public async Task<IActionResult> SugerirTipo([FromBody] SugerirTipoRequest request)
        {
            try
            {
                var pacienteIdClaim = User.FindFirst("PacienteId")?.Value;
                var tipoUsuario = User.FindFirst("TipoUsuario")?.Value;
                var isAdmin = User.FindFirst("IsAdmin")?.Value?.ToLower() == "true";

                Guid? pId = null;
                if (!string.IsNullOrEmpty(pacienteIdClaim) && Guid.TryParse(pacienteIdClaim, out var parsedId))
                {
                    pId = parsedId;
                }

                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

                var result = await _consultaService.SugerirTipoAsync(request.Sintomas, pId, tipoUsuario, isAdmin, usuarioLogadoId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (RateLimitExceededException ex)
            {
                return StatusCode(429, ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(503, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno na triagem de sintomas pelo Gemini.");
                return StatusCode(502, "Serviço de sugestão temporariamente indisponível.");
            }
        }

        [HttpGet("violacoes")]
        public async Task<IActionResult> GetViolacoes()
        {
            var adminClaim = User.FindFirst("IsAdmin")?.Value;
            if (adminClaim?.ToLower() != "true") return Forbid("Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesAsync();
            return Ok(violacoes);
        }

        [HttpDelete("violacoes/{pacienteId}/penalidade")]
        public async Task<IActionResult> RemoverPenalidade(Guid pacienteId)
        {
            var adminClaim = User.FindFirst("IsAdmin")?.Value;
            if (adminClaim?.ToLower() != "true") return Forbid("Apenas administradores podem remover penalidades.");

            try
            {
                await _consultaService.RemoverPenalidadeAsync(pacienteId);
                return Ok(new { Mensagem = "Penalidade de IA removida com sucesso. Paciente será notificado no próximo login." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("violacoes-debug")]
        public async Task<IActionResult> GetViolacoesDebug()
        {
            var adminClaim = User.FindFirst("IsAdmin")?.Value;
            if (adminClaim?.ToLower() != "true") return StatusCode(403, "Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesDebugAsync();
            return Ok(violacoes);
        }
    }
}
