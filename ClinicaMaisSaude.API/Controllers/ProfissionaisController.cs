using ClinicaMaisSaude.Application.DTOs.Profissional;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
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
            if (resultado == null) throw new NotFoundException("Profissional não encontrado.");
            return Ok(resultado);
        }

        // Edição cadastral do profissional pela tela de usuários (acesso restrito ao admin,
        // único perfil que lista profissionais ali).
        [HttpPut("{id}")]
        [Authorize(Roles = PerfisUsuario.Admin)]
        public async Task<IActionResult> Atualizar(Guid id, [FromBody] ProfissionalUpdateRequest request)
        {
            var resultado = await _profissionalService.AtualizarAsync(id, request);
            return Ok(resultado);
        }
    }
}
