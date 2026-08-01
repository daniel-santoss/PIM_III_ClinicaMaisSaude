using ClinicaMaisSaude.Application.DTOs.Consulta;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
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

        public ConsultasController(IConsultaService consultaService)
        {
            _consultaService = consultaService;
        }

        [HttpPost("sugerir-tipo")]
        public async Task<IActionResult> SugerirTipo([FromBody] SugerirTipoRequest request)
        {
            var pacienteIdClaim = User.FindFirst(ClinicaClaims.PacienteId)?.Value;
            var tipoUsuario = User.FindFirst(ClinicaClaims.TipoUsuario)?.Value;
            var isAdmin = User.FindFirst(ClinicaClaims.IsAdmin)?.Value?.ToLower() == "true";

            Guid? pId = null;
            if (!string.IsNullOrEmpty(pacienteIdClaim) && Guid.TryParse(pacienteIdClaim, out var parsedId))
            {
                pId = parsedId;
            }

            var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var result = await _consultaService.SugerirTipoAsync(request.Sintomas, pId, tipoUsuario, isAdmin, usuarioLogadoId);
            return Ok(result);
        }

        [HttpGet("violacoes")]
        public async Task<IActionResult> GetViolacoes()
        {
            var adminClaim = User.FindFirst(ClinicaClaims.IsAdmin)?.Value;
            if (adminClaim?.ToLower() != "true")
                throw new ForbiddenException("Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesAsync();
            return Ok(violacoes);
        }

        [HttpDelete("violacoes/{pacienteId}/penalidade")]
        public async Task<IActionResult> RemoverPenalidade(Guid pacienteId)
        {
            var adminClaim = User.FindFirst(ClinicaClaims.IsAdmin)?.Value;
            if (adminClaim?.ToLower() != "true")
                throw new ForbiddenException("Apenas administradores podem remover penalidades.");

            await _consultaService.RemoverPenalidadeAsync(pacienteId);
            return Ok(new { Mensagem = "Penalidade de IA removida com sucesso. Paciente será notificado no próximo login." });
        }

        [HttpGet("violacoes-debug")]
        public async Task<IActionResult> GetViolacoesDebug()
        {
            var adminClaim = User.FindFirst(ClinicaClaims.IsAdmin)?.Value;
            if (adminClaim?.ToLower() != "true")
                throw new ForbiddenException("Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesDebugAsync();
            return Ok(violacoes);
        }
    }
}
