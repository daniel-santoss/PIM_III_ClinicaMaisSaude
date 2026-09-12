using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
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
    public class AgendamentosController : ClinicaControllerBase
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
            // Bloqueia a criação por médicos, exceto o Admin ou se for um agendamento de Retorno
            if (EhMedico && !IsAdmin && request.TipoConsulta != (int)ClinicaMaisSaude.Domain.Enums.TipoConsulta.Retorno)
                throw new ForbiddenException("Médicos não têm permissão para agendar consultas. Apenas Enfermeiras e Pacientes.");

            if (EhPaciente && request.PacienteId != PacienteIdToken)
                throw new ForbiddenException("Você não pode agendar consultas para outros pacientes.");

            var resultado = await _agendamentoService.AdicionarAsync(request, UsuarioLogadoId);
            return Created("", resultado);
        }

        [HttpGet]
        public async Task<IActionResult> ObterTodos([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? busca = null, [FromQuery] string? data = null, [FromQuery] string? status = null, [FromQuery] bool riscoAltoApenas = false, [FromQuery] string ordem = "asc")
        {
            Guid? filtroProf = null;
            Guid? filtroPac = null;

            if (!IsAdmin && EhPaciente)
                filtroPac = PacienteIdToken;
            else if (!IsAdmin && EhMedico)
                filtroProf = ProfissionalIdToken;
            // Enfermeira e Admin: sem filtro de ID, veem tudo (sujeito aos parâmetros de busca)

            var result = await _agendamentoService.ObterTodosPaginadoAsync(page, pageSize, filtroProf, filtroPac, busca, data, status, riscoAltoApenas, ordem);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var agendamento = await _agendamentoService.ObterPorIdAsync(id);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");
            return Ok(agendamento);
        }

        [HttpGet("horarios-disponiveis")]
        public async Task<IActionResult> ObterHorariosDisponiveis([FromQuery] DateTime data, [FromQuery] int tipoConsulta, [FromQuery] int? especialidadeId = null, [FromQuery] Guid? origemId = null)
        {
            var horarios = await _agendamentoService.ObterHorariosDisponiveisAsync(data, tipoConsulta, especialidadeId, origemId);
            return Ok(horarios);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarAgendamento(Guid id, [FromBody] AgendamentoRequest request)
        {
            var resultado = await _agendamentoService.AtualizarAsync(id, request, UsuarioLogadoId);
            return Ok(resultado);
        }

        [Authorize]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AlterarStatus(Guid id, [FromBody] int novoStatus)
        {
            if (EhPaciente)
            {
                if (novoStatus != 6)
                    throw new ForbiddenException("Pacientes só podem alterar o status para Cancelado.");

                var agendamento = await _agendamentoService.ObterPorIdAsync(id);
                if (agendamento == null)
                    throw new NotFoundException("Agendamento não encontrado.");

                if (agendamento.PacienteId != PacienteIdToken)
                    throw new ForbiddenException("Você não pode cancelar consultas de outros pacientes.");
            }

            var resultado = await _agendamentoService.AlterarStatusAsync(id, novoStatus, UsuarioLogadoId);
            return Ok(resultado);
        }

        [HttpPatch("{id}/remarcar")]
        [Authorize]
        public async Task<IActionResult> RemarcarAgendamento(Guid id, [FromBody] RemarcarAgendamentoRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!IsAdmin && EhPaciente)
            {
                var agendamento = await _agendamentoService.ObterPorIdAsync(id);
                if (agendamento == null)
                    throw new NotFoundException("Agendamento não encontrado.");

                if (agendamento.PacienteId != PacienteIdToken)
                    throw new ForbiddenException("Você não pode remarcar consultas de outros pacientes.");
            }

            var resultado = await _agendamentoService.RemarcarAsync(id, request, UsuarioLogadoId);
            return Ok(resultado);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletarAgendamento(Guid id)
        {
            await _agendamentoService.DeletarAsync(id, UsuarioLogadoId);
            return NoContent();
        }

        [HttpGet("{id}/historico")]
        public async Task<IActionResult> ObterHistorico(Guid id)
        {
            var historico = await _agendamentoService.ObterHistoricoAsync(id);
            return Ok(historico);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/concluir-exame")]
        public async Task<IActionResult> ConcluirExame(Guid id, [FromBody] bool exigeResultadoPosterior)
        {
            await _agendamentoService.ConcluirExameAsync(id, exigeResultadoPosterior, UsuarioLogadoId);
            return Ok(new { Mensagem = "Exame concluído." });
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/resultado-disponivel")]
        public async Task<IActionResult> MarcarResultadoDisponivel(Guid id)
        {
            await _agendamentoService.MarcarResultadoDisponivelAsync(id);
            return Ok(new { Mensagem = "Resultado marcado como disponível." });
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/resultado-retirado")]
        public async Task<IActionResult> MarcarResultadoRetirado(Guid id)
        {
            await _agendamentoService.MarcarResultadoRetiradoAsync(id);
            return Ok(new { Mensagem = "Resultado marcado como retirado." });
        }

        [HttpGet("{agendamentoId}/probabilidade-falta")]
        public async Task<IActionResult> ObterProbabilidadeFalta(Guid agendamentoId)
        {
            var agendamento = await _agendamentoService.ObterPorIdAsync(agendamentoId);
            if (agendamento == null)
                throw new NotFoundException("Agendamento não encontrado.");

            var (probabilidade, nivel) = await _probabilidadeFaltaService.CalcularProbabilidadeAsync(agendamento.PacienteId, agendamento.DataHoraConsulta);

            return Ok(new
            {
                AgendamentoId = agendamentoId,
                Probabilidade = probabilidade,
                Nivel = nivel
            });
        }
    }
}
