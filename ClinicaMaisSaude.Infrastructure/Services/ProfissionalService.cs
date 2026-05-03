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
                .FirstOrDefaultAsync(p => p.Id == id);

            if (prof == null) return null;

            return new
            {
                prof.Id,
                prof.Nome,
                prof.Crm,
                prof.UfCrm,
                TipoProfissional = prof.TipoProfissional.ToString(),
                Email = prof.Usuario?.Email
            };
        }
    }
}
