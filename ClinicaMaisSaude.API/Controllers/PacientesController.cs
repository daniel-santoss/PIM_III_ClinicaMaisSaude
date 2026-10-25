using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.Application.DTOs;
using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PacientesController : ClinicaControllerBase
    {
        private readonly IPacienteService _pacienteService;
        private readonly IAuthorizationService _authorizationService;

        public PacientesController(IPacienteService pacienteService, IAuthorizationService authorizationService) {
            _pacienteService = pacienteService;
            _authorizationService = authorizationService;
        }

        [HttpPost]
        public async Task<IActionResult> CriarPaciente([FromBody] PacienteRequest request)
        {
            var resultado = await _pacienteService.AdicionarAsync(request);
            return Created("", resultado);
        }

        // O paciente lê só a própria ficha; a enfermeira (recepção) lê qualquer uma.
        // Sem permissão responde 404, para não revelar que o paciente existe.
        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var paciente = await _pacienteService.ObterPorIdAsync(id);
            if (paciente == null
                || !(await _authorizationService.AuthorizeAsync(User, paciente, OperacoesPaciente.Ler)).Succeeded)
                throw new NotFoundException("Paciente não encontrado.");

            return Ok(paciente);
        }

        [HttpGet]
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> ObterTodos([FromQuery] string? nome, [FromQuery] string? cpf, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _pacienteService.ObterTodosPaginadoAsync(nome, cpf, IsAdmin, page, pageSize);

            return Ok(result);
        }

        // Edição cadastral pela recepção. O próprio paciente edita seus dados por PATCH /api/Perfil,
        // que não expõe o TemProblemaMemoria (dado que alimenta o cálculo de risco de falta).
        [HttpPut("{id}")]
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> AtualizarPaciente(Guid id, [FromBody] PacienteRequest request)
        {
            var resultado = await _pacienteService.AtualizarAsync(id, request);
            return Ok(resultado);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = PerfisUsuario.Admin)]
        public async Task<IActionResult> DesativarPaciente(Guid id)
        {
            await _pacienteService.DesativarAsync(id);
            return NoContent();
        }
        [HttpGet("inativos")]
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> ObterInativos([FromQuery] int dias = 60)
        {
            var pacientes = await _pacienteService.ObterInativosAsync(dias);
            return Ok(pacientes);
        }
    }
}
