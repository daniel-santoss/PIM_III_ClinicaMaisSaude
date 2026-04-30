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
                
                if (tipoUsuario == "Paciente")
                {
                    var pacienteIdToken = User.FindFirstValue("PacienteId");
                    if (request.PacienteId != Guid.Parse(pacienteIdToken!))
                    {
                        return StatusCode(403, "Você não pode agendar consultas para outros pacientes.");
                    }
                }

                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var resultado = await _agendamentoService.AdicionarAsync(request, usuarioLogadoId);
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

            var isAdmin = User.FindFirstValue("IsAdmin") == "true";

            // Regra rigorosa de Data Privacy: Cada um enxerga exclusivamente seu quadrado
            // EXCETO o Administrador, que enxerga tudo.
            if (isAdmin)
            {
                // Não aplica filtros
            }
            else if (tipoUsuario == "Paciente")
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

        [HttpGet("horarios-disponiveis")]
        public async Task<IActionResult> ObterHorariosDisponiveis([FromQuery] DateTime data, [FromQuery] int tipoConsulta)
        {
            try
            {
                var horarios = await _agendamentoService.ObterHorariosDisponiveisAsync(data, tipoConsulta);
                return Ok(horarios);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarAgendamento(Guid id, [FromBody] AgendamentoRequest request)
        {
            try
            {
                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var resultado = await _agendamentoService.AtualizarAsync(id, request, usuarioLogadoId);
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
                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var resultado = await _agendamentoService.AlterarStatusAsync(id, novoStatus, usuarioLogadoId);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPatch("{id}/remarcar")]
        [Authorize]
        public async Task<IActionResult> RemarcarAgendamento(Guid id, [FromBody] RemarcarAgendamentoRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == "IsAdmin")?.Value;
                var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);

                if (isAdminClaim != "true" && tipoUsuario == "Paciente")
                {
                    return StatusCode(403, "Pacientes não têm permissão para remarcar consultas livremente. Entre em contato com a clínica.");
                }

                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var resultado = await _agendamentoService.RemarcarAsync(id, request, usuarioLogadoId);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletarAgendamento(Guid id)
        {
            try
            {
                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                await _agendamentoService.DeletarAsync(id, usuarioLogadoId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}/historico")]
        public async Task<IActionResult> ObterHistorico(Guid id)
        {
            try
            {
                // Aqui podemos adicionar verificação se o paciente está consultando o próprio histórico, se necessário.
                var historico = await _agendamentoService.ObterHistoricoAsync(id);
                return Ok(historico);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }
    }
}
