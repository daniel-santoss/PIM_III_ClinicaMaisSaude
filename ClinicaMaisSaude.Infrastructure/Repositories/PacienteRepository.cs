using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    public class PacienteRepository : IPacienteRepository
    {
        private readonly ClinicaDbContext _context;

        public PacienteRepository(ClinicaDbContext context)
        {
            _context = context;
        }
        public async Task AdicionarAsync(Paciente paciente)
        {
            // Adiciona um paciente ao banco de dados
            await _context.Pacientes.AddAsync(paciente);

            // Salva as alterações no banco de dados
            await _context.SaveChangesAsync();
        }
        public async Task<Paciente?> ObterPorIdAsync(Guid id)
        {
            return await _context.Pacientes
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Paciente?> ObterPorCpfAsync(string cpf)
        {
            return await _context.Pacientes
                                .AsNoTracking()
                                .FirstOrDefaultAsync(p => p.Cpf == cpf);
        }

        public async Task<IEnumerable<Paciente>> ObterTodosAsync(string? nome = null, string? cpf = null)
        {
            var query = _context.Pacientes
                                .AsNoTracking()
                                .Include(p => p.Usuario)
                                .Where(p => p.Ativo);

            if (!string.IsNullOrWhiteSpace(nome))
                query = query.Where(p => p.Nome.Contains(nome));

            if (!string.IsNullOrWhiteSpace(cpf))
                query = query.Where(p => p.Cpf.StartsWith(cpf));

            return await query.ToListAsync();
        }

        public async Task<(IEnumerable<Paciente> Items, int TotalCount)> ObterTodosPaginadoAsync(string? nome, string? cpf, int page, int pageSize)
        {
            var query = _context.Pacientes
                                .AsNoTracking()
                                .Include(p => p.Usuario)
                                .Where(p => p.Ativo);

            if (!string.IsNullOrWhiteSpace(nome))
                query = query.Where(p => p.Nome.Contains(nome));

            if (!string.IsNullOrWhiteSpace(cpf))
                query = query.Where(p => p.Cpf.StartsWith(cpf));

            query = query.OrderBy(p => p.Nome);

            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return (items, totalCount);
        }

        public async Task AtualizarAsync(Paciente paciente)
        {
            _context.Pacientes.Update(paciente);
            await _context.SaveChangesAsync();
        }

    }
}
