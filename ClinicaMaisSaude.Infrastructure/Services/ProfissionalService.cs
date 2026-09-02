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
    }
}
