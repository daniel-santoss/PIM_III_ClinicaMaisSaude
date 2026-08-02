using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EspecialidadesController : ControllerBase
    {
        private readonly IEspecialidadeService _especialidadeService;

        public EspecialidadesController(IEspecialidadeService especialidadeService)
        {
            _especialidadeService = especialidadeService;
        }

        [HttpGet("lista")]
        [AllowAnonymous]
        public IActionResult ListarTodas()
        {
            return Ok(_especialidadeService.ListarTodas());
        }

        [HttpGet("disponiveis")]
        [AllowAnonymous]
        public async Task<IActionResult> ListarDisponiveis()
        {
            return Ok(await _especialidadeService.ListarDisponiveisAsync());
        }

        [HttpGet("minhas")]
        public async Task<IActionResult> ObterMinhas()
        {
            var profissionalId = ObterProfissionalId();
            if (profissionalId == null)
                throw new ForbiddenException("Apenas profissionais podem acessar especialidades.");

            var resultado = await _especialidadeService.ObterMinhasAsync(profissionalId.Value);
            if (resultado == null) throw new NotFoundException("Especialidades não encontradas.");
            return Ok(resultado);
        }

        [HttpPut("minhas")]
        public async Task<IActionResult> AtualizarMinhas([FromBody] List<int> especialidadeIds)
        {
            var profissionalId = ObterProfissionalId();
            if (profissionalId == null)
                throw new ForbiddenException("Apenas profissionais podem acessar especialidades.");

            var resultado = await _especialidadeService.AtualizarMinhasAsync(profissionalId.Value, especialidadeIds);
            if (resultado == null) throw new NotFoundException("Especialidades não encontradas.");
            return Ok(resultado);
        }

        private Guid? ObterProfissionalId()
        {
            var claim = User.FindFirst("ProfissionalId")?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}
