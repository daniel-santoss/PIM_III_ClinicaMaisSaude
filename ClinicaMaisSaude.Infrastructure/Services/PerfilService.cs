using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class PerfilService : IPerfilService
    {
        private readonly ClinicaDbContext _context;

        public PerfilService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<object?> ObterPerfilAsync(Guid usuarioId, string tipoUsuario)
        {
            if (tipoUsuario == PerfisUsuario.Paciente)
            {
                var paciente = await _context.Pacientes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
                if (paciente == null) return null;

                var usuario = await _context.Usuarios.AsNoTracking().Include(u => u.Foto).FirstOrDefaultAsync(u => u.Id == usuarioId);
                return new { tipo = PerfisUsuario.Paciente, paciente.Nome, paciente.Email, paciente.Telefone, paciente.Cpf, FotoBase64 = usuario?.FotoBase64 };
            }

            var profissional = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario).ThenInclude(u => u.Foto)
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);

            if (profissional == null) return null;

            return new
            {
                tipo = profissional.TipoProfissional.ToString(),
                profissional.Nome,
                Email = profissional.Usuario?.Email,
                Cpf = profissional.Usuario?.Cpf,
                profissional.Crm,
                profissional.UfCrm,
                Especialidades = profissional.Especialidades.Select(e => new { id = (int)e.EspecialidadeId }),
                FotoBase64 = profissional.Usuario?.FotoBase64
            };
        }

        public async Task<string?> AtualizarPerfilAsync(Guid usuarioId, string tipoUsuario, string? nome, string? email, string? telefone)
        {
            if (tipoUsuario == PerfisUsuario.Paciente)
            {
                var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
                if (paciente == null) return "Perfil de paciente não encontrado.";

                if (!string.IsNullOrWhiteSpace(nome))
                    paciente.AtualizarNome(nome.Trim());
                if (!string.IsNullOrWhiteSpace(email))
                    paciente.AtualizarEmail(email.Trim().ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(telefone))
                    paciente.AtualizarTelefone(telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", "").Trim());

                await _context.SaveChangesAsync();
                return null; // sucesso
            }

            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId);
            var profissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (usuario == null || profissional == null) return "Perfil não encontrado.";

            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailNorm = email.Trim().ToLowerInvariant();
                var existe = await _context.Usuarios.AnyAsync(u => u.Email == emailNorm && u.Id != usuarioId);
                if (existe) return "Este e-mail já está em uso.";
                usuario.AtualizarEmail(emailNorm);
            }

            if (!string.IsNullOrWhiteSpace(nome))
            {
                profissional.AtualizarNome(nome.Trim());
            }

            await _context.SaveChangesAsync();
            return null; // sucesso
        }

        public async Task<string?> AlterarSenhaAsync(Guid usuarioId, string senhaAtual, string novaSenha)
        {
            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) return "Usuário não encontrado.";

            if (!BCrypt.Net.BCrypt.Verify(senhaAtual, usuario.SenhaHash))
                return "A senha atual está incorreta.";

            if (BCrypt.Net.BCrypt.Verify(novaSenha, usuario.SenhaHash))
                return "A nova senha não pode ser igual a senha atual!";

            usuario.AlterarSenha(BCrypt.Net.BCrypt.HashPassword(novaSenha));
            await _context.SaveChangesAsync();

            return null; // sucesso
        }
        public async Task<string?> AtualizarFotoAsync(Guid usuarioId, string base64)
        {
            // Carrega a navegação Foto para que AtualizarFoto faça UPDATE (se já existe) em
            // vez de tentar um INSERT duplicado na tabela UsuarioFotos.
            var usuario = await _context.Usuarios.Include(u => u.Foto).FirstOrDefaultAsync(u => u.Id == usuarioId);
            if (usuario == null) return "Usuário não encontrado.";

            usuario.AtualizarFoto(base64);
            await _context.SaveChangesAsync();
            return null;
        }
    }
}
