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
    public class EspecialidadesController : ClinicaControllerBase
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
            var profissionalId = ProfissionalIdToken;
            if (profissionalId == null)
                throw new ForbiddenException("Apenas profissionais podem acessar especialidades.");

            var resultado = await _especialidadeService.ObterMinhasAsync(profissionalId.Value);
            if (resultado == null) throw new NotFoundException("Especialidades não encontradas.");
            return Ok(resultado);
        }

        [HttpPut("minhas")]
        public async Task<IActionResult> AtualizarMinhas([FromBody] List<int> especialidadeIds)
        {
            var profissionalId = ProfissionalIdToken;
            if (profissionalId == null)
                throw new ForbiddenException("Apenas profissionais podem acessar especialidades.");

            var resultado = await _especialidadeService.AtualizarMinhasAsync(profissionalId.Value, especialidadeIds);
            if (resultado == null) throw new NotFoundException("Especialidades não encontradas.");
            return Ok(resultado);
        }
    }
}
