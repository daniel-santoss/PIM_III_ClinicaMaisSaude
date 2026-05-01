using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PerfilController : ControllerBase
    {
        private readonly ClinicaDbContext _context;

        public PerfilController(ClinicaDbContext context)
        {
            _context = context;
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

            if (tipoUsuario == "Paciente")
            {
                var paciente = await _context.Pacientes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
                if (paciente == null) return NotFound("Perfil de paciente não encontrado.");

                return Ok(new { tipo = "Paciente", paciente.Nome, paciente.Email, paciente.Telefone, paciente.Cpf });
            }

            var profissional = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);

            if (profissional == null) return NotFound("Perfil de profissional não encontrado.");

            return Ok(new
            {
                tipo = profissional.TipoProfissional.ToString(),
                profissional.Nome,
                Email = profissional.Usuario?.Email,
                Cpf = profissional.Usuario?.Cpf,
                profissional.Crm,
                profissional.UfCrm,
                Especialidades = profissional.Especialidades.Select(e => new { id = (int)e.EspecialidadeId })
            });
        }

        [HttpPatch]
        public async Task<IActionResult> AtualizarPerfil([FromBody] PerfilUpdateRequest request)
        {
            var usuarioId = ObterUsuarioId();
            if (usuarioId == null) return Unauthorized();

            var tipoUsuario = User.FindFirstValue("TipoUsuario") ?? User.FindFirstValue(ClaimTypes.Role);

            if (tipoUsuario == "Paciente")
            {
                var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
                if (paciente == null) return NotFound();

                if (!string.IsNullOrWhiteSpace(request.Nome))
                    paciente.AtualizarNome(request.Nome.Trim());
                if (!string.IsNullOrWhiteSpace(request.Email))
                    paciente.AtualizarEmail(request.Email.Trim().ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(request.Telefone))
                    paciente.AtualizarTelefone(request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", "").Trim());

                await _context.SaveChangesAsync();
                return Ok(new { Mensagem = "Perfil atualizado com sucesso." });
            }

            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId);
            var profissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (usuario == null || profissional == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailNorm = request.Email.Trim().ToLowerInvariant();
                var existe = await _context.Usuarios.AnyAsync(u => u.Email == emailNorm && u.Id != usuarioId);
                if (existe) return BadRequest("Este e-mail já está em uso.");
                usuario.AtualizarEmail(emailNorm);
            }

            if (!string.IsNullOrWhiteSpace(request.Nome))
            {
                // Altera diretamente o valor rastreado pelo EF Core sem precisar injetar novo método no Domínio
                _context.Entry(profissional).Property(p => p.Nome).CurrentValue = request.Nome.Trim();
            }

            await _context.SaveChangesAsync();
            return Ok(new { Mensagem = "Perfil atualizado com sucesso." });
        }

        private Guid? ObterUsuarioId()
        {
            var claim = User.FindFirstValue("UsuarioId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
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

            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.SenhaAtual, usuario.SenhaHash))
                return BadRequest("A senha atual está incorreta.");
            
            if(BCrypt.Net.BCrypt.Verify(request.NovaSenha, usuario.SenhaHash))
                return BadRequest("A nova senha não pode ser igual a senha atual!");

            usuario.AlterarSenha(BCrypt.Net.BCrypt.HashPassword(request.NovaSenha));
            await _context.SaveChangesAsync();

            return Ok(new { Mensagem = "Senha alterada com sucesso." });
        }
    }
}