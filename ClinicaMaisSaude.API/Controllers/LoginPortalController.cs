using ClinicaMaisSaude.API.Authorization;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Exceptions;
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
    public class LoginPortalController : ClinicaControllerBase
    {
        private readonly ICadastroService _cadastroService;
        private readonly IAuthorizationService _authorizationService;
        private readonly IWebHostEnvironment _ambiente;

        public LoginPortalController(ICadastroService cadastroService, IAuthorizationService authorizationService, IWebHostEnvironment ambiente)
        {
            _cadastroService = cadastroService;
            _authorizationService = authorizationService;
            _ambiente = ambiente;
        }

        [HttpPost("cadastro")]
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> CadastroAdmin([FromBody] CadastroRequest request)
        {
            if (!IsAdmin && request.TipoUsuario != PerfisUsuario.Paciente)
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
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> ListarUsuarios()
        {
            var usuarios = await _cadastroService.ListarUsuariosAsync();
            return Ok(usuarios);
        }

        // A enfermeira só redefine senha de contas de paciente (regra no ContaAuthorizationHandler);
        // conta inexistente ou fora do alcance responde 404, sem revelar que existe.
        [HttpPatch("{id}/reset-senha")]
        [Authorize(Roles = PerfisUsuario.Enfermeira)]
        public async Task<IActionResult> ResetarSenha(Guid id, [FromBody] ResetSenhaRequest request)
        {
            var role = await _cadastroService.ObterRoleAsync(id);
            if (role == null
                || !(await _authorizationService.AuthorizeAsync(User, new ContaUsuario(id, role.Value), OperacoesConta.RedefinirSenha)).Succeeded)
                throw new NotFoundException("Usuário não encontrado.");

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

        // Limpeza dos dados criados pela homologação E2E. Só existe em desenvolvimento:
        // em qualquer outro ambiente a rota responde 404. Erros seguem para o GlobalExceptionHandler
        // (que não expõe a mensagem interna da exceção).
        [HttpDelete("purge-tests")]
        [Authorize(Roles = PerfisUsuario.Admin)]
        public async Task<IActionResult> PurgeTests()
        {
            if (!_ambiente.IsDevelopment())
                return NotFound();

            await _cadastroService.PurgeTestsAsync();
            return Ok(new { Mensagem = "Restauração completa de banco de dados (Pristine Purge) executada com sucesso!" });
        }

    }
}
