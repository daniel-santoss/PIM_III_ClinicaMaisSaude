using ClinicaMaisSaude.Application.DTOs;
using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;
using Microsoft.AspNetCore.Mvc;

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
    }
}
