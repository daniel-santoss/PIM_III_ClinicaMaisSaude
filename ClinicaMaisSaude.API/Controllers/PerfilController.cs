using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PerfilController : ControllerBase
    {
        private readonly IPerfilService _perfilService;

        public PerfilController(IPerfilService perfilService)
        {
            _perfilService = perfilService;
        }

        public class PerfilUpdateRequest
        {
            public string? Nome { get; set; }
            public string? Email { get; set; }
            public string? Telefone { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> ObterPerfil()
        {
            var usuarioId = ObterUsuarioId();
            if (usuarioId == null) return Unauthorized();

            var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
            var resultado = await _perfilService.ObterPerfilAsync(usuarioId.Value, tipoUsuario ?? "");
            if (resultado == null) return NotFound("Perfil não encontrado.");
            return Ok(resultado);
        }

        [HttpPatch]
        public async Task<IActionResult> AtualizarPerfil([FromBody] PerfilUpdateRequest request)
        {
            var usuarioId = ObterUsuarioId();
            if (usuarioId == null) return Unauthorized();

            var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);
            var erro = await _perfilService.AtualizarPerfilAsync(usuarioId.Value, tipoUsuario ?? "", request.Nome, request.Email, request.Telefone);
            if (erro != null) return BadRequest(erro);
            return Ok(new { Mensagem = "Perfil atualizado com sucesso." });
        }

        public class AlterarSenhaRequest
        {
            public string SenhaAtual { get; set; } = string.Empty;
            public string NovaSenha { get; set; } = string.Empty;
        }

        [HttpPatch("senha")]
        public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaRequest request)
        {
            var usuarioId = ObterUsuarioId();
            if (usuarioId == null) return Unauthorized();

            var erro = await _perfilService.AlterarSenhaAsync(usuarioId.Value, request.SenhaAtual, request.NovaSenha);
            if (erro != null) return BadRequest(erro);
            return Ok(new { Mensagem = "Senha alterada com sucesso." });
        }

        private Guid? ObterUsuarioId()
        {
            var claim = User.FindFirstValue("UsuarioId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}