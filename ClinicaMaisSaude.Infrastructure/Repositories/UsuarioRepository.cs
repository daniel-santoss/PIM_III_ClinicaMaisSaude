using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
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
            return await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<string> ObterNomeUsuarioAsync(Guid id)
        {
            // Nome é único e vive no LoginPortal (identidade), independentemente do perfil.
            var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            return usuario?.Nome ?? "Sistema";
        }
    }
}
