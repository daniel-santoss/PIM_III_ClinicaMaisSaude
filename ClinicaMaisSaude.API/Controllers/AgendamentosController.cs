using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
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
            return Ok(agendamentos);
        }

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
