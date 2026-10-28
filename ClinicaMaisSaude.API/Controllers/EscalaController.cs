using ClinicaMaisSaude.Application.DTOs.Escala;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Controle da escala 12x36 (admin): calendário do mês com quantos profissionais estão de
    /// plantão por dia, detalhe do dia e registro de folga/ausência.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = PerfisUsuario.Admin)]
    public class EscalaController : ClinicaControllerBase
    {
        private readonly IEscalaService _escalaService;

        public EscalaController(IEscalaService escalaService)
        {
            _escalaService = escalaService;
        }

        [HttpGet("mes")]
        public async Task<IActionResult> ObterMes([FromQuery] int ano, [FromQuery] int mes)
            => Ok(await _escalaService.ObterMesAsync(ano, mes));

        [HttpGet("dia")]
        public async Task<IActionResult> ObterDia([FromQuery] DateTime data)
            => Ok(await _escalaService.ObterDiaAsync(data));

        [HttpPost("ausencias")]
        public async Task<IActionResult> RegistrarAusencia([FromBody] RegistrarAusenciaRequest request)
            => Ok(await _escalaService.RegistrarAusenciaAsync(request, UsuarioLogadoId));

        [HttpDelete("ausencias/{id}")]
        public async Task<IActionResult> RemoverAusencia(Guid id)
        {
            await _escalaService.RemoverAusenciaAsync(id);
            return NoContent();
        }
    }
}
