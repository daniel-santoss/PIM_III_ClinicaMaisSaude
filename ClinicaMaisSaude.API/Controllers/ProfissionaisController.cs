using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfissionaisController : ControllerBase
    {
        private readonly IProfissionalService _profissionalService;

        public ProfissionaisController(IProfissionalService profissionalService)
        {
            _profissionalService = profissionalService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var resultado = await _profissionalService.ObterPorIdAsync(id);
            if (resultado == null) return NotFound("Profissional não encontrado.");
            return Ok(resultado);
        }
    }
}
