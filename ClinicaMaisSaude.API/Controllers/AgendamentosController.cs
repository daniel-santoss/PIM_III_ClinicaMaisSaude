using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
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
        private readonly IAuthorizationService _authorizationService;

        public AgendamentosController(IAgendamentoService agendamentoService, IProbabilidadeFaltaService probabilidadeFaltaService, IAuthorizationService authorizationService)
        {
            _agendamentoService = agendamentoService;
            _probabilidadeFaltaService = probabilidadeFaltaService;
            _authorizationService = authorizationService;
        }

        // Autorização de recurso: carrega o agendamento (404 se não existe) e pergunta ao
        // AgendamentoAuthorizationHandler se o usuário pode executar a operação sobre ele.
        // Sem permissão também responde 404 (e não 403), para não revelar que o agendamento existe.
        private async Task<AgendamentoResponse> BuscarAutorizadoAsync(Guid id, OperationAuthorizationRequirement operacao)
        {
            var agendamento = await _agendamentoService.BuscarPorIdAsync(id);
            var autorizacao = await _authorizationService.AuthorizeAsync(User, agendamento, operacao);
            if (!autorizacao.Succeeded)
                throw new NotFoundException("Agendamento não encontrado.");
            return agendamento;
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
            else if (!IsAdmin && ProfissionalIdToken is not null)
                // Profissional não-admin (médico OU enfermeira) vê apenas os agendamentos
                // delegados a ele — a enfermeira antes caía no "vê tudo" por não ter ramo próprio.
                filtroProf = ProfissionalIdToken;
            // Admin: sem filtro de ID, vê tudo (sujeito aos parâmetros de busca)

            var result = await _agendamentoService.ObterTodosPaginadoAsync(page, pageSize, filtroProf, filtroPac, busca, data, status, riscoAltoApenas, ordem);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var agendamento = await BuscarAutorizadoAsync(id, OperacoesAgendamento.Ler);
            return Ok(agendamento);
        }

        [HttpGet("horarios-disponiveis")]
        public async Task<IActionResult> ObterHorariosDisponiveis([FromQuery] DateTime data, [FromQuery] int tipoConsulta, [FromQuery] int? especialidadeId = null, [FromQuery] Guid? origemId = null)
        {
            var horarios = await _agendamentoService.ObterHorariosDisponiveisAsync(data, tipoConsulta, especialidadeId, origemId);
            return Ok(horarios);
        }

        // Calendário do app: dias do mês com ao menos um horário livre (mesma regra de horarios-disponiveis).
        [HttpGet("dias-disponiveis")]
        public async Task<IActionResult> ObterDiasDisponiveis([FromQuery] int ano, [FromQuery] int mes, [FromQuery] int tipoConsulta, [FromQuery] int? especialidadeId = null, [FromQuery] Guid? origemId = null)
        {
            var dias = await _agendamentoService.ObterDiasDisponiveisAsync(ano, mes, tipoConsulta, especialidadeId, origemId);
            return Ok(dias);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarAgendamento(Guid id, [FromBody] AgendamentoRequest request)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Gerenciar);
            var resultado = await _agendamentoService.AtualizarAsync(id, request, UsuarioLogadoId);
            return Ok(resultado);
        }

        [Authorize]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AlterarStatus(Guid id, [FromBody] int novoStatus)
        {
            if (EhPaciente && novoStatus != 6)
                throw new ForbiddenException("Pacientes só podem alterar o status para Cancelado.");

            await BuscarAutorizadoAsync(id, OperacoesAgendamento.AlterarStatus);

            var resultado = await _agendamentoService.AlterarStatusAsync(id, novoStatus, UsuarioLogadoId);
            return Ok(resultado);
        }

        [HttpPatch("{id}/remarcar")]
        [Authorize]
        public async Task<IActionResult> RemarcarAgendamento(Guid id, [FromBody] RemarcarAgendamentoRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Remarcar);

            var resultado = await _agendamentoService.RemarcarAsync(id, request, UsuarioLogadoId);
            return Ok(resultado);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletarAgendamento(Guid id)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Gerenciar);
            await _agendamentoService.DeletarAsync(id, UsuarioLogadoId);
            return NoContent();
        }

        [HttpGet("{id}/historico")]
        public async Task<IActionResult> ObterHistorico(Guid id)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Ler);
            var historico = await _agendamentoService.ObterHistoricoAsync(id);
            return Ok(historico);
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/concluir-exame")]
        public async Task<IActionResult> ConcluirExame(Guid id, [FromBody] bool exigeResultadoPosterior)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Gerenciar);
            await _agendamentoService.ConcluirExameAsync(id, exigeResultadoPosterior, UsuarioLogadoId);
            return Ok(new { Mensagem = "Exame concluído." });
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/resultado-disponivel")]
        public async Task<IActionResult> MarcarResultadoDisponivel(Guid id)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Gerenciar);
            await _agendamentoService.MarcarResultadoDisponivelAsync(id);
            return Ok(new { Mensagem = "Resultado marcado como disponível." });
        }

        [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
        [HttpPatch("{id}/resultado-retirado")]
        public async Task<IActionResult> MarcarResultadoRetirado(Guid id)
        {
            await BuscarAutorizadoAsync(id, OperacoesAgendamento.Gerenciar);
            await _agendamentoService.MarcarResultadoRetiradoAsync(id);
            return Ok(new { Mensagem = "Resultado marcado como retirado." });
        }

        [HttpGet("{agendamentoId}/probabilidade-falta")]
        public async Task<IActionResult> ObterProbabilidadeFalta(Guid agendamentoId)
        {
            var agendamento = await BuscarAutorizadoAsync(agendamentoId, OperacoesAgendamento.VerRisco);

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
