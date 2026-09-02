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
            // Avaliado no cliente (fora da árvore de expressão) para o EF traduzir a comparação por constante.
            var role = PapeisMap.RoleDoTipo(tipo);
            return await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Pessoa)
                .Include(p => p.Especialidades)
                .Where(p => p.Usuario.Role == role)
                .ToListAsync();
        }

        public async Task<Profissional?> ObterPorIdAsync(Guid id)
        {
            return await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario).ThenInclude(u => u.Foto)
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Profissional>> ObterTodosAsync()
        {
            return await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario).ThenInclude(u => u.Foto)
                .Include(p => p.Pessoa)
                .Include(p => p.Especialidades)
                .ToListAsync();
        }
    }
}
