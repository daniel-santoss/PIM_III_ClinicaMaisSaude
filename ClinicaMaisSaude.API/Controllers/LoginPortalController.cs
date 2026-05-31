using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoginPortalController : ControllerBase
    {
        private readonly ICadastroService _cadastroService;

        public LoginPortalController(ICadastroService cadastroService)
        {
            _cadastroService = cadastroService;
        }

        [HttpPost("cadastro")]
        [Authorize]
        public async Task<IActionResult> CadastroAdmin([FromBody] CadastroRequest request)
        {
            var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.IsAdmin)?.Value;
            var tipoUsuario = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.TipoUsuario)?.Value;

            if (isAdminClaim != "true" && tipoUsuario != PerfisUsuario.Enfermeira)
            {
                return Forbid();
            }

            if (isAdminClaim != "true" && request.TipoUsuario != PerfisUsuario.Paciente)
            {
                return BadRequest("Enfermeiras só podem cadastrar novos Pacientes.");
            }

            var resultado = await _cadastroService.CadastrarAsync(request);

            if (!resultado.Sucesso)
            {
                return BadRequest(resultado.Mensagem);
            }

            return Ok(new { Mensagem = resultado.Mensagem });
        }

        [HttpGet("usuarios")]
        [Authorize]
        public async Task<IActionResult> ListarUsuarios()
        {
            var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.IsAdmin)?.Value;
            var tipoUsuario = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.TipoUsuario)?.Value;

            if (isAdminClaim != "true" && tipoUsuario != PerfisUsuario.Enfermeira)
            {
                return Forbid();
            }

            var usuarios = await _cadastroService.ListarUsuariosAsync();
            return Ok(usuarios);
        }

        [HttpPatch("{id}/reset-senha")]
        [Authorize]
        public async Task<IActionResult> ResetarSenha(Guid id, [FromBody] ResetSenhaRequest request)
        {
            var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.IsAdmin)?.Value;
            var tipoUsuario = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.TipoUsuario)?.Value;

            if (isAdminClaim != "true" && tipoUsuario != PerfisUsuario.Enfermeira)
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(request.NovaSenha))
            {
                return BadRequest("A nova senha não pode ser vazia.");
            }

            var resultado = await _cadastroService.RedefinirSenhaAsync(id, request.NovaSenha);

            if (!resultado.Sucesso)
            {
                return BadRequest(resultado.Mensagem);
            }

            return Ok(new { Mensagem = resultado.Mensagem });
        }

        [HttpDelete("purge-tests")]
        [Authorize]
        public async Task<IActionResult> PurgeTests()
        {
            var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == ClinicaClaims.IsAdmin)?.Value;
            if (isAdminClaim != "true")
            {
                return Forbid("Apenas administradores de sistemas podem purgar dados de homologação.");
            }

            try
            {
                await _cadastroService.PurgeTestsAsync();
                return Ok(new { Mensagem = "Restauração completa de banco de dados (Pristine Purge) executada com sucesso!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao purgar dados: {ex.Message}");
            }
        }

    }
}
