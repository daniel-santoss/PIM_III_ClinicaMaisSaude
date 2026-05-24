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
        private readonly IProbabilidadeFaltaService _probabilidadeFaltaService;

        public AgendamentosController(IAgendamentoService agendamentoService, IProbabilidadeFaltaService probabilidadeFaltaService)
        {
            _agendamentoService = agendamentoService;
            _probabilidadeFaltaService = probabilidadeFaltaService;
        }

        [HttpPost]
        public async Task<IActionResult> CriarAgendamento([FromBody] AgendamentoRequest request)
        {
            try
            {
                var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
                var isAdmin = User.FindFirstValue("IsAdmin") == "true";

                // Bloqueia a criação por médicos, exceto o Admin
                if (tipoUsuario == "Medico" && !isAdmin)
                {
                    return StatusCode(403, "Médicos não têm permissão para agendar consultas. Apenas Enfermeiras e Pacientes.");
                }

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
        public async Task<IActionResult> ObterTodos([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? busca = null, [FromQuery] string? data = null, [FromQuery] string? status = null, [FromQuery] bool riscoAltoApenas = false, [FromQuery] string ordem = "asc")
        {
            var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = User.FindFirstValue("IsAdmin") == "true";

            Guid? filtroProf = null;
            Guid? filtroPac = null;

            if (!isAdmin && tipoUsuario == "Paciente")
            {
                var pacienteIdStr = User.FindFirstValue("PacienteId");
                if (Guid.TryParse(pacienteIdStr, out var pacienteId))
                    filtroPac = pacienteId;
            }
            else if (!isAdmin && tipoUsuario == "Medico")
            {
                var profissionalIdStr = User.FindFirstValue("ProfissionalId");
                if (Guid.TryParse(profissionalIdStr, out var profissionalId))
                    filtroProf = profissionalId;
            }
            // Enfermeira e Admin: sem filtro de ID, veem tudo (sujeito aos parâmetros de busca)

            var result = await _agendamentoService.ObterTodosPaginadoAsync(page, pageSize, filtroProf, filtroPac, busca, data, status, riscoAltoApenas, ordem);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            try
            {
                var agendamento = await _agendamentoService.ObterPorIdAsync(id);
                if (agendamento == null)
                    return NotFound("Agendamento não encontrado.");
                return Ok(agendamento);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("horarios-disponiveis")]
        public async Task<IActionResult> ObterHorariosDisponiveis([FromQuery] DateTime data, [FromQuery] int tipoConsulta, [FromQuery] int? especialidadeId = null, [FromQuery] Guid? origemId = null)
        {
            try
            {
                var horarios = await _agendamentoService.ObterHorariosDisponiveisAsync(data, tipoConsulta, especialidadeId, origemId);
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

        [Authorize]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AlterarStatus(Guid id, [FromBody] int novoStatus)
        {
            try
            {
                var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
                if (tipoUsuario == "Paciente")
                {
                    if (novoStatus != 6)
                    {
                        return StatusCode(403, "Pacientes só podem alterar o status para Cancelado.");
                    }
                    var agendamento = await _agendamentoService.ObterPorIdAsync(id);
                    if (agendamento == null)
                    {
                        return NotFound("Agendamento não encontrado.");
                    }
                    var pacienteIdToken = User.FindFirstValue("PacienteId");
                    if (agendamento.PacienteId != Guid.Parse(pacienteIdToken!))
                    {
                        return StatusCode(403, "Você não pode cancelar consultas de outros pacientes.");
                    }
                }

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
                    var agendamento = await _agendamentoService.ObterPorIdAsync(id);
                    if (agendamento == null)
                    {
                        return NotFound("Agendamento não encontrado.");
                    }
                    var pacienteIdToken = User.FindFirstValue("PacienteId");
                    if (agendamento.PacienteId != Guid.Parse(pacienteIdToken!))
                    {
                        return StatusCode(403, "Você não pode remarcar consultas de outros pacientes.");
                    }
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
                var historico = await _agendamentoService.ObterHistoricoAsync(id);
                return Ok(historico);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }
        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPatch("{id}/concluir-exame")]
        public async Task<IActionResult> ConcluirExame(Guid id, [FromBody] bool exigeResultadoPosterior)
        {
            try
            {
                var usuarioLogadoId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                await _agendamentoService.ConcluirExameAsync(id, exigeResultadoPosterior, usuarioLogadoId);
                return Ok(new { Mensagem = "Exame concluído." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPatch("{id}/resultado-disponivel")]
        public async Task<IActionResult> MarcarResultadoDisponivel(Guid id)
        {
            try
            {
                await _agendamentoService.MarcarResultadoDisponivelAsync(id);
                return Ok(new { Mensagem = "Resultado marcado como disponível." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }

        [Authorize(Roles = "Medico,Enfermeira")]
        [HttpPatch("{id}/resultado-retirado")]
        public async Task<IActionResult> MarcarResultadoRetirado(Guid id)
        {
            try
            {
                await _agendamentoService.MarcarResultadoRetiradoAsync(id);
                return Ok(new { Mensagem = "Resultado marcado como retirado." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }

        [HttpGet("{agendamentoId}/probabilidade-falta")]
        public async Task<IActionResult> ObterProbabilidadeFalta(Guid agendamentoId)
        {
            try
            {
                var agendamento = await _agendamentoService.ObterPorIdAsync(agendamentoId);
                if (agendamento == null)
                    return NotFound("Agendamento não encontrado.");

                var (probabilidade, nivel) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);

                return Ok(new
                {
                    AgendamentoId = agendamentoId,
                    Probabilidade = probabilidade,
                    Nivel = nivel
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mensagem = ex.Message });
            }
        }
    }
}
