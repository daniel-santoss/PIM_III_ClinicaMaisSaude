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

                // Identidade (Thread B): Nome/Email/Telefone/Cpf vêm da Pessoa; a foto continua na conta.
                var usuario = await _context.Usuarios.AsNoTracking().Include(u => u.Foto).Include(u => u.Pessoa).FirstOrDefaultAsync(u => u.Id == usuarioId);
                return new { tipo = PerfisUsuario.Paciente, usuario?.Pessoa?.Nome, usuario?.Pessoa?.Email, usuario?.Pessoa?.Telefone, usuario?.Pessoa?.Cpf, FotoBase64 = usuario?.FotoBase64 };
            }

            var profissional = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario).ThenInclude(u => u.Foto)
                .Include(p => p.Pessoa)
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);

            if (profissional == null) return null;

            return new
            {
                // Categoria a partir do papel unificado (Role é a fonte única — Fase A3b).
                tipo = profissional.Usuario?.Role.ToString(),
                // Identidade (Thread B): Nome/Email/Telefone/Cpf vêm da Pessoa; a foto continua na conta.
                Nome = profissional.Pessoa?.Nome,
                Email = profissional.Pessoa?.Email,
                Telefone = profissional.Pessoa?.Telefone,
                Cpf = profissional.Pessoa?.Cpf,
                profissional.Crm,
                profissional.UfCrm,
                Especialidades = profissional.Especialidades.Select(e => new { id = (int)e.EspecialidadeId }),
                FotoBase64 = profissional.Usuario?.FotoBase64
            };
        }

        public async Task<string?> AtualizarPerfilAsync(Guid usuarioId, string tipoUsuario, string? nome, string? email, string? telefone)
        {
            // Identidade (Thread B): Nome/Email/Telefone vivem na Pessoa (fonte única). Carrega a
            // conta com a Pessoa para editá-la; a existência do perfil (paciente/profissional) é validada.
            var usuario = await _context.Usuarios.Include(u => u.Pessoa).FirstOrDefaultAsync(u => u.Id == usuarioId);
            if (usuario?.Pessoa == null) return "Perfil não encontrado.";

            if (tipoUsuario == PerfisUsuario.Paciente)
            {
                var existePaciente = await _context.Pacientes.AnyAsync(p => p.UsuarioId == usuarioId);
                if (!existePaciente) return "Perfil de paciente não encontrado.";
            }
            else
            {
                var existeProfissional = await _context.Profissionais.AnyAsync(p => p.UsuarioId == usuarioId);
                if (!existeProfissional) return "Perfil não encontrado.";
            }

            var pessoa = usuario.Pessoa;

            if (!string.IsNullOrWhiteSpace(nome))
                pessoa.AtualizarNome(nome.Trim());

            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailNorm = email.Trim().ToLowerInvariant();
                var existe = await _context.Pessoas.AnyAsync(p => p.Email == emailNorm && p.Id != pessoa.Id);
                if (existe) return "Este e-mail já está em uso.";
                pessoa.AtualizarEmail(emailNorm);
            }

            if (!string.IsNullOrWhiteSpace(telefone))
                pessoa.AtualizarTelefone(telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", "").Trim());

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

        // Exclusão de conta pelo próprio paciente (self-service). Soft-delete coerente
        // com §1.6 (marca o paciente inativo) + revoga os refresh tokens para encerrar
        // sessões existentes. A senha atual é exigida como prova de identidade.
        // A posse é garantida pela camada web: o usuarioId vem do token, não da rota.
        public async Task<string?> ExcluirContaAsync(Guid usuarioId, string tipoUsuario, string senha)
        {
            // Apenas contas de paciente se autoexcluem pelo app; profissionais/admin
            // são geridos internamente.
            if (tipoUsuario != PerfisUsuario.Paciente)
                return "Apenas contas de paciente podem ser excluídas pelo aplicativo.";

            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) return "Usuário não encontrado.";

            if (string.IsNullOrWhiteSpace(senha) || !BCrypt.Net.BCrypt.Verify(senha, usuario.SenhaHash.Trim()))
                return "Senha incorreta.";

            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);
            if (paciente == null) return "Perfil de paciente não encontrado.";

            // Exclusão self-service → Situacao = Excluido (soft-delete).
            paciente.Excluir();

            // Revoga refresh tokens ativos → nenhuma sessão consegue renovar o acesso.
            var tokens = await _context.RefreshTokens
                .Where(t => t.UsuarioId == usuarioId && !t.Revogado)
                .ToListAsync();
            foreach (var t in tokens)
                t.Revogado = true;

            await _context.SaveChangesAsync();
            return null; // sucesso
        }
    }
}
