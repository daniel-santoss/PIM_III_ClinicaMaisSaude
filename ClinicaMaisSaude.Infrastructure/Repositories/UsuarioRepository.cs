using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    public class UsuarioRepository : IUsuarioRepository
    {
        private readonly ClinicaDbContext _context;

        public UsuarioRepository(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<Usuario?> ObterPorIdAsync(Guid id)
        {
            return await _context.Usuarios.FindAsync(id);
        }

        public async Task<string> ObterNomeUsuarioAsync(Guid id)
        {
            // 1. Verificar se é um profissional
            var profissional = await _context.Profissionais.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == id);
            if (profissional != null) return profissional.Nome;

            // 2. Verificar se é um paciente
            var paciente = await _context.Pacientes.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == id);
            if (paciente != null) return paciente.Nome;

            // 3. Verificar se é admin puro
            var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            if (usuario != null && usuario.IsAdmin) return "Administrador";

            return "Sistema";
        }
    }
}
