using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    public class ProfissionalRepository : IProfissionalRepository
    {
        private readonly ClinicaDbContext _context;

        public ProfissionalRepository(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Profissional>> ObterTodosPorTipoAsync(TipoProfissional tipo)
        {
            return await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Where(p => p.TipoProfissional == tipo)
                .ToListAsync();
        }

        public async Task<Profissional?> ObterPorIdAsync(Guid id)
        {
            return await _context.Profissionais
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.Id == id);
        }
    }
}
