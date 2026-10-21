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
    public class ConsultasController : ClinicaControllerBase
    {
        private readonly IConsultaService _consultaService;

        public ConsultasController(IConsultaService consultaService)
        {
            _consultaService = consultaService;
        }

        [HttpPost("sugerir-tipo")]
        public async Task<IActionResult> SugerirTipo([FromBody] SugerirTipoRequest request)
        {
            var result = await _consultaService.SugerirTipoAsync(request.Sintomas, PacienteIdToken, TipoUsuario, IsAdmin, UsuarioLogadoId);
            return Ok(result);
        }

        [HttpGet("violacoes")]
        public async Task<IActionResult> GetViolacoes()
        {
            if (!IsAdmin)
                throw new ForbiddenException("Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesAsync();
            return Ok(violacoes);
        }

        [HttpDelete("violacoes/{pacienteId}/penalidade")]
        public async Task<IActionResult> RemoverPenalidade(Guid pacienteId)
        {
            if (!IsAdmin)
                throw new ForbiddenException("Apenas administradores podem remover penalidades.");

            await _consultaService.RemoverPenalidadeAsync(pacienteId);
            return Ok(new { Mensagem = "Penalidade de IA removida com sucesso. Paciente será notificado no próximo login." });
        }

        [HttpGet("violacoes-debug")]
        public async Task<IActionResult> GetViolacoesDebug()
        {
            if (!IsAdmin)
                throw new ForbiddenException("Apenas administradores podem ver as violações.");

            var violacoes = await _consultaService.ObterViolacoesDebugAsync();
            return Ok(violacoes);
        }
    }
}
