using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [Authorize] // Bloqueia todo o controle
    [ApiController]
    [Route("api/[controller]")]
    public class AgendamentosController : ControllerBase
    {
        private readonly IAgendamentoService _agendamentoService;

        public AgendamentosController(IAgendamentoService agendamentoService)
        {
            _agendamentoService = agendamentoService;
        }

        [HttpPost]
        public async Task<IActionResult> CriarAgendamento([FromBody] AgendamentoRequest request)
        {
            try
            {
                var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
                
                // Medida de Segurança Crítica: Um paciente não pode forjar a criação de agenda para outro!
                if (tipoUsuario == "Paciente")
                {
                    var pacienteIdToken = User.FindFirstValue("PacienteId");
                    request.PacienteId = Guid.Parse(pacienteIdToken!);
                }

                var resultado = await _agendamentoService.AdicionarAsync(request);
                return Created("", resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> ObterTodos()
        {
            var agendamentos = await _agendamentoService.ObterTodosAsync();

            var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);

            // Regra rigorosa de Data Privacy: Cada um enxerga exclusivamente seu quadrado
            if (tipoUsuario == "Paciente")
            {
                var pacienteIdStr = User.FindFirstValue("PacienteId");
                if (Guid.TryParse(pacienteIdStr, out var pacienteId))
                {
                    agendamentos = agendamentos.Where(a => a.PacienteId == pacienteId);
                }
            }
            else if (tipoUsuario == "Medico" || tipoUsuario == "Enfermeira")
            {
                var profissionalIdStr = User.FindFirstValue("ProfissionalId");
                if (Guid.TryParse(profissionalIdStr, out var profissionalId))
                {
                    agendamentos = agendamentos.Where(a => a.ProfissionalId == profissionalId);
                }
            }

            return Ok(agendamentos);
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarAgendamento(Guid id, [FromBody] AgendamentoRequest request)
        {
            try
            {
                var resultado = await _agendamentoService.AtualizarAsync(id, request);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AlterarStatus(Guid id, [FromBody] int novoStatus)
        {
            try
            {
                var resultado = await _agendamentoService.AlterarStatusAsync(id, novoStatus);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletarAgendamento(Guid id)
        {
            try
            {
                await _agendamentoService.DeletarAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
