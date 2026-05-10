using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    public class NotificacaoRepository : INotificacaoRepository
    {
        private readonly ClinicaDbContext _context;

        public NotificacaoRepository(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task AdicionarAsync(Notificacao notificacao)
        {
            await _context.Notificacoes.AddAsync(notificacao);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Notificacao>> ObterPorUsuarioIdAsync(Guid usuarioId)
        {
            return await _context.Notificacoes
                .AsNoTracking()
                .Where(n => n.UsuarioId == usuarioId)
                .OrderByDescending(n => n.DtCriado)
                .ToListAsync();
        }

        public async Task<Notificacao?> ObterPorIdAsync(Guid id)
        {
            return await _context.Notificacoes.FindAsync(id);
        }

        public async Task AtualizarAsync(Notificacao notificacao)
        {
            _context.Notificacoes.Update(notificacao);
            await _context.SaveChangesAsync();
        }

        public async Task RemoverAsync(Notificacao notificacao)
        {
            _context.Notificacoes.Remove(notificacao);
            await _context.SaveChangesAsync();
        }
    }
}
