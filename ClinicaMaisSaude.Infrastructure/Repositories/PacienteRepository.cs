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
            return await _context.Pacientes.FindAsync(id);
        }

        public async Task<Paciente?> ObterPorCpfAsync(string cpf)
        {
            return await _context.Pacientes
                                .AsNoTracking()
                                .FirstOrDefaultAsync(p => p.Cpf == cpf);
        }

        public async Task<IEnumerable<Paciente>> ObterTodosAsync()
        {
            return await _context.Pacientes
                                 .AsNoTracking()
                                 .ToListAsync();
        }

    }
}
