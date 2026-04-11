using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    public class AgendamentoRepository : IAgendamentoRepository
    {
        private readonly ClinicaDbContext _context;

        public AgendamentoRepository(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task AdicionarAsync(Agendamento agendamento)
        {
            await _context.Agendamentos.AddAsync(agendamento);
            await _context.SaveChangesAsync();
        }
        public async Task<Agendamento?> ObterPorIdAsync(Guid id)
        {
            return await _context.Agendamentos.FindAsync(id);
        }

        public async Task AtualizarAsync(Agendamento agendamento)
        {
            _context.Agendamentos.Update(agendamento);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date)
        {
            return await _context.Agendamentos
                .Where(x => x.DataHoraConsulta.Date == date.Date)
                .ToListAsync();
        }

    }
}
