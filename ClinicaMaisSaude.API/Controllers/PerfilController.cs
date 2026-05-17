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

        [HttpPost("foto")]
        [RequestSizeLimit(3_000_000)]
        public async Task<IActionResult> AtualizarFoto(IFormFile foto)
        {
            var usuarioId = ObterUsuarioId();
            if (usuarioId == null) return Unauthorized();

            if (foto == null || foto.Length == 0)
                return BadRequest(new { Mensagem = "Nenhuma imagem enviada." });

            if (foto.Length > 2_000_000)
                return BadRequest(new { Mensagem = "A imagem deve ter no máximo 2 MB." });

            var tiposPermitidos = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!tiposPermitidos.Contains(foto.ContentType.ToLower()))
                return BadRequest(new { Mensagem = "Formato inválido. Use JPEG, PNG ou WEBP." });

            using var ms = new MemoryStream();
            await foto.CopyToAsync(ms);
            var base64 = $"data:{foto.ContentType};base64,{Convert.ToBase64String(ms.ToArray())}";

            var erro = await _perfilService.AtualizarFotoAsync(usuarioId.Value, base64);
            if (erro != null) return BadRequest(new { Mensagem = erro });

            return Ok(new { Mensagem = "Foto atualizada com sucesso.", FotoBase64 = base64 });
        }

        private Guid? ObterUsuarioId()
        {
            var claim = User.FindFirstValue("UsuarioId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}