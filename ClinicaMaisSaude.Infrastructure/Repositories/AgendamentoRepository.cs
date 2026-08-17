using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
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

        public async Task<IEnumerable<Agendamento>> ObterTodosPorPacienteIdAsync(Guid pacienteId)
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .Where(a => a.PacienteId == pacienteId)
                .OrderByDescending(a => a.DataHoraConsulta)
                .ToListAsync();
        }

        public async Task<IEnumerable<AgendamentoHistorico>> ObterHistoricoPorPacienteIdAsync(Guid pacienteId)
        {
            return await _context.AgendamentoHistoricos
                .AsNoTracking()
                .Include(h => h.Agendamento)
                .Where(h => h.Agendamento.PacienteId == pacienteId)
                .OrderBy(h => h.Dt_Criado)
                .ToListAsync();
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
                .ThenInclude(p => p.Usuario)
                .ThenInclude(u => u.Foto)
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
                .ThenInclude(p => p.Usuario)
                .Where(x => x.DataHoraConsulta.Date == date.Date)
                .ToListAsync();
        }

        public async Task<IEnumerable<Agendamento>> ObterTodosAsync()
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .Include(a => a.Paciente)
                .ThenInclude(p => p.Usuario)
                .ThenInclude(u => u.Foto)
                .ToListAsync();
        }

        public async Task<(IEnumerable<Agendamento> Items, int TotalCount)> ObterTodosPaginadoAsync(int page, int pageSize, Guid? profissionalId = null, Guid? pacienteId = null, string? buscaPaciente = null, string? dataConsulta = null, string? status = null, bool riscoAltoApenas = false, string ordem = "asc")
        {
            var query = _context.Agendamentos
                                .AsNoTracking()
                                .Include(a => a.Paciente)
                                .ThenInclude(p => p.Usuario)
                                .ThenInclude(u => u.Foto)
                                .AsQueryable();

            if (profissionalId.HasValue)
                query = query.Where(a => a.ProfissionalId == profissionalId.Value);

            if (pacienteId.HasValue)
                query = query.Where(a => a.PacienteId == pacienteId.Value);

            if (!string.IsNullOrWhiteSpace(buscaPaciente))
            {
                // CPF por prefixo (SARGable, usa índice); nome por Contains (UX de busca).
                // Para nome em escala, a evolução seria full-text search do SQL Server.
                query = query.Where(a => a.Paciente.Usuario.Nome.Contains(buscaPaciente) || a.Paciente.Usuario.Cpf.StartsWith(buscaPaciente));
            }

            if (!string.IsNullOrWhiteSpace(dataConsulta))
            {
                if (DateTime.TryParse(dataConsulta, out DateTime parsedDate))
                {
                    query = query.Where(a => a.DataHoraConsulta.Date == parsedDate.Date);
                }
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusList = status.Split(',').Select(s => Enum.Parse<ClinicaMaisSaude.Domain.Enums.StatusAgendamento>(s)).ToList();
                query = query.Where(a => statusList.Contains(a.Status));
            }

            if (riscoAltoApenas)
            {
                // Risco Média ou Alta: probabilidade > 30
                query = query.Where(a => a.ProbabilidadeFalta > 30);
            }

            if (ordem.ToLower() == "desc")
            {
                query = query.OrderByDescending(a => a.DataHoraConsulta);
            }
            else
            {
                query = query.OrderBy(a => a.DataHoraConsulta);
            }

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

        public async Task<IEnumerable<Agendamento>> ObterAtivosDoProfissionalNoDiaAsync(Guid profissionalId, DateTime dia, Guid? ignorarAgendamentoId)
        {
            var inicioDia = dia.Date;
            var fimDia = inicioDia.AddDays(1);

            return await _context.Agendamentos
                .AsNoTracking()
                .Where(a => a.ProfissionalId == profissionalId &&
                            a.DataHoraConsulta >= inicioDia && a.DataHoraConsulta < fimDia &&
                            a.Status != StatusAgendamento.Cancelado &&
                            a.Status != StatusAgendamento.Finalizado &&
                            a.Status != StatusAgendamento.Faltou &&
                            (ignorarAgendamentoId == null || a.Id != ignorarAgendamentoId))
                .ToListAsync();
        }

        public async Task<IEnumerable<Agendamento>> ObterAtivosDoPacienteNoDiaAsync(Guid pacienteId, DateTime dia, Guid? ignorarAgendamentoId)
        {
            var inicioDia = dia.Date;
            var fimDia = inicioDia.AddDays(1);

            return await _context.Agendamentos
                .AsNoTracking()
                .Where(a => a.PacienteId == pacienteId &&
                            a.DataHoraConsulta >= inicioDia && a.DataHoraConsulta < fimDia &&
                            a.Status != StatusAgendamento.Cancelado &&
                            a.Status != StatusAgendamento.Finalizado &&
                            a.Status != StatusAgendamento.Faltou &&
                            (ignorarAgendamentoId == null || a.Id != ignorarAgendamentoId))
                .ToListAsync();
        }

        public async Task<int> ContarNaoCanceladosNoDiaAsync(Guid profissionalId, DateTime dia)
        {
            var inicioDia = dia.Date;
            var fimDia = inicioDia.AddDays(1);

            return await _context.Agendamentos
                .AsNoTracking()
                .CountAsync(a => a.ProfissionalId == profissionalId &&
                                 a.DataHoraConsulta >= inicioDia && a.DataHoraConsulta < fimDia &&
                                 a.Status != StatusAgendamento.Cancelado);
        }

        public async Task<int> ContarAtivosDoProfissionalAsync(Guid profissionalId)
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .CountAsync(a => a.ProfissionalId == profissionalId &&
                                 a.Status != StatusAgendamento.Cancelado &&
                                 a.Status != StatusAgendamento.Finalizado &&
                                 a.Status != StatusAgendamento.Faltou);
        }

        public async Task<bool> ExisteAgendamentoDoPacienteComStatusAsync(Guid pacienteId, StatusAgendamento status)
        {
            return await _context.Agendamentos
                .AsNoTracking()
                .AnyAsync(a => a.PacienteId == pacienteId && a.Status == status);
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
