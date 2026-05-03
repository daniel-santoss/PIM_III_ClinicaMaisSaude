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
            return await _context.Agendamentos
                .Include(a => a.Paciente)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task AtualizarAsync(Agendamento agendamento)
        {
            _context.Agendamentos.Update(agendamento);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Agendamento>> ObterAgendamentosDoDiaAsync(DateTime date)
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .Include(a => a.Paciente)
                .Where(x => x.DataHoraConsulta.Date == date.Date)
                .ToListAsync();
        }

        public async Task<IEnumerable<Agendamento>> ObterTodosAsync()
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .Include(a => a.Paciente)
                .ToListAsync();
        }

        public async Task<(IEnumerable<Agendamento> Items, int TotalCount)> ObterTodosPaginadoAsync(int page, int pageSize)
        {
            var query = _context.Agendamentos
                                .AsNoTracking()
                                .Include(a => a.Paciente)
                                .OrderByDescending(a => a.DataHoraConsulta);

            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return (items, totalCount);
        }

        public async Task DeletarAsync(Agendamento agendamento)
        {
            _context.Agendamentos.Remove(agendamento);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExisteAgendamentoNoHorarioAsync(Guid profissionalId, DateTime dataHora)
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .AnyAsync(a => a.ProfissionalId == profissionalId && a.DataHoraConsulta == dataHora);
        }

        public async Task AdicionarHistoricoAsync(AgendamentoHistorico historico)
        {
            await _context.AgendamentoHistoricos.AddAsync(historico);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorAgendamentoAsync(Guid agendamentoId)
        {
            return await _context.AgendamentoHistoricos
                .AsNoTracking()
                .Where(h => h.AgendamentoId == agendamentoId)
                .OrderBy(h => h.Dt_Criado)
                .ToListAsync();
        }
    }
}
