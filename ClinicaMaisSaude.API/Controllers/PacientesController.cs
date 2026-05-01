using ClinicaMaisSaude.Application.DTOs;
using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PacientesController : ControllerBase
    {
        private readonly IPacienteService _pacienteService;

        public PacientesController(IPacienteService pacienteService) {
            _pacienteService = pacienteService;
        }

        [HttpPost]
        public async Task<IActionResult> CriarPaciente([FromBody] PacienteRequest request)
        {
            try
            {
                var resultado = await _pacienteService.AdicionarAsync(request);
                return Created("", resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var paciente = await _pacienteService.ObterPorIdAsync(id);
            if (paciente == null)
                return NotFound("Paciente não encontrado.");

            return Ok(paciente);
        }

        [HttpGet]
        public async Task<IActionResult> ObterTodos([FromQuery] string? nome, [FromQuery] string? cpf)
        {
            var isAdmin = User.FindFirstValue("IsAdmin") == "true";
            var pacientes = await _pacienteService.ObterTodosAsync(nome, cpf, isAdmin);

            return Ok(pacientes);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarPaciente(Guid id, [FromBody] PacienteRequest request)
        {
            try
            {
                var resultado = await _pacienteService.AtualizarAsync(id, request);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DesativarPaciente(Guid id)
        {
            try
            {
                await _pacienteService.DesativarAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpGet("inativos")]
        public async Task<IActionResult> ObterInativos([FromQuery] int dias = 60)
        {
            var pacientes = await _pacienteService.ObterInativosAsync(dias);
            return Ok(pacientes);
        }
    }
}
