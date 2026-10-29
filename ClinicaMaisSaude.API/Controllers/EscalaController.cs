using ClinicaMaisSaude.Application.DTOs.Escala;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Controle da escala 12x36 (admin): calendário do mês com alertas por dia, detalhe do dia
    /// (paginado), visão de um profissional e registro de folga/ausência.
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
        public async Task<IActionResult> ObterDia([FromQuery] DateTime data, [FromQuery] string? busca = null,
            [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 8,
            [FromQuery] string? tipo = null, [FromQuery] bool somenteAusentes = false)
        {
            // tipo: "Medico" ou "Enfermeira" (mesmo nome do papel devolvido pela API).
            RoleUsuario? papel = tipo switch
            {
                null or "" => null,
                PerfisUsuario.Medico => RoleUsuario.Medico,
                PerfisUsuario.Enfermeira => RoleUsuario.Enfermeira,
                _ => throw new ValidationException("Tipo de profissional inválido.")
            };
            return Ok(await _escalaService.ObterDiaAsync(data, busca, pagina, tamanhoPagina, papel, somenteAusentes));
        }

        [HttpGet("profissionais")]
        public async Task<IActionResult> BuscarProfissionais([FromQuery] string? busca = null)
            => Ok(await _escalaService.BuscarProfissionaisAsync(busca));

        [HttpGet("profissionais/{id}")]
        public async Task<IActionResult> ObterMesDoProfissional(Guid id, [FromQuery] int ano, [FromQuery] int mes)
            => Ok(await _escalaService.ObterMesDoProfissionalAsync(id, ano, mes));

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
