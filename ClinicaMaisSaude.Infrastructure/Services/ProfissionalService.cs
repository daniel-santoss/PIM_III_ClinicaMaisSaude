using ClinicaMaisSaude.Application.DTOs.Profissional;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class ProfissionalService : IProfissionalService
    {
        private readonly ClinicaDbContext _context;

        public ProfissionalService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<object?> ObterPorIdAsync(Guid id)
        {
            var prof = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (prof == null) return null;

            return new
            {
                prof.Id,
                // Identidade a partir da Pessoa (fonte única — Thread B).
                Nome = prof.Pessoa?.Nome,
                prof.Crm,
                prof.UfCrm,
                // Categoria do profissional a partir do papel unificado (Role é a fonte única — Fase A3b).
                TipoProfissional = prof.Usuario?.Role.ToString(),
                Email = prof.Pessoa?.Email
            };
        }

        // Edição cadastral do profissional (tela de usuários). A identidade vive na
        // Pessoa (fonte única), então atualizamos lá — espelha PacienteService.AtualizarAsync.
        // O CPF é inalterável.
        public async Task<object> AtualizarAsync(Guid id, ProfissionalUpdateRequest request)
        {
            var prof = await _context.Profissionais
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == id)
                ?? throw new NotFoundException("Profissional não encontrado.");

            if (prof.Pessoa != null)
            {
                if (!string.IsNullOrWhiteSpace(request.Nome))
                    prof.Pessoa.AtualizarNome(request.Nome);
                if (!string.IsNullOrWhiteSpace(request.Email))
                    prof.Pessoa.AtualizarEmail(request.Email.Trim().ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(request.Telefone))
                    prof.Pessoa.AtualizarTelefone(request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", ""));
            }

            await _context.SaveChangesAsync();

            return new
            {
                prof.Id,
                Nome = prof.Pessoa?.Nome,
                Cpf = prof.Pessoa?.Cpf,
                Telefone = prof.Pessoa?.Telefone,
                Email = prof.Pessoa?.Email,
                TipoProfissional = prof.Usuario?.Role.ToString()
            };
        }
    }
}
