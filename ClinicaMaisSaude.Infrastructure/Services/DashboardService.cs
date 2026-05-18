using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly ClinicaDbContext _db;

        public DashboardService(ClinicaDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardEstatisticasDto> ObterEstatisticasAsync(DateTime dataInicio, DateTime dataFim, Guid? profissionalId, bool isAdmin, string[]? status = null, string[]? especialidades = null)
        {
            var filtroProf = isAdmin ? profissionalId : profissionalId;

            var query = _db.Agendamentos
                .AsNoTracking()
                .Where(a => a.DataHoraConsulta >= dataInicio && a.DataHoraConsulta <= dataFim);

            if (filtroProf.HasValue)
                query = query.Where(a => a.ProfissionalId == filtroProf.Value);

            // Filtro por múltiplos status
            if (status != null && status.Length > 0)
            {
                var statusParsed = status
                    .Select(s => Enum.TryParse<StatusAgendamento>(s, out var parsed) ? (StatusAgendamento?)parsed : null)
                    .Where(s => s.HasValue)
                    .Select(s => s!.Value)
                    .ToList();
                if (statusParsed.Count > 0)
                    query = query.Where(a => statusParsed.Contains(a.Status));
            }

            // Filtro por múltiplas especialidades
            if (especialidades != null && especialidades.Length > 0)
            {
                var espParsed = especialidades
                    .Select(e => MapearEspecialidade(e))
                    .Where(e => e.HasValue)
                    .Select(e => e!.Value)
                    .ToList();
                if (espParsed.Count > 0)
                {
                    var profIds = _db.ProfissionalEspecialidades
                        .Where(pe => espParsed.Contains(pe.EspecialidadeId))
                        .Select(pe => pe.ProfissionalId);
                    query = query.Where(a => profIds.Contains(a.ProfissionalId));
                }
            }

            var totalAgendamentos = await query.CountAsync();
            var statusList = await query.GroupBy(a => a.Status).Select(g => new { Status = g.Key, Total = g.Count() }).ToListAsync();
            var diasList = await query.GroupBy(a => a.DataHoraConsulta.Date).Select(g => new { Data = g.Key, Total = g.Count() }).OrderBy(x => x.Data).ToListAsync();
            var faltasCount = await query.CountAsync(a => a.Status == StatusAgendamento.Faltou);
            
            var totalExames = await query.CountAsync(a => a.TipoConsulta == TipoConsulta.Exame);
            var liberados = await query.CountAsync(a => a.TipoConsulta == TipoConsulta.Exame && a.ResultadoDisponivel);
            var pendentes = await query.CountAsync(a => a.TipoConsulta == TipoConsulta.Exame && a.ExigeResultadoPosterior && !a.ResultadoDisponivel);

            var dto = new DashboardEstatisticasDto
            {
                TotalAgendamentos = totalAgendamentos,
                AgendamentosPorStatus = statusList.ToDictionary(x => x.Status.ToString(), x => x.Total),
                AgendamentosPorDia = diasList.Select(x => new AgendamentoPorDiaDto { Data = x.Data.ToString("yyyy-MM-dd"), Total = x.Total }).ToList(),
                EspecialidadesMaisProcuradas = await ObterEspecialidadesAsync(dataInicio, dataFim, filtroProf),
                TaxaAbsenteismo = totalAgendamentos > 0 ? Math.Round((decimal)faltasCount / totalAgendamentos * 100, 2) : 0,
                PacientesNovosVsRecorrentes = await ObterNovosVsRecorrentesAsync(dataInicio, dataFim, filtroProf),
                TopRiscoFalta = await ObterTopRiscoFaltaAsync(dataInicio, dataFim, filtroProf),
                FluxoExames = new FluxoExamesDto { Total = totalExames, Liberados = liberados, Pendentes = pendentes }
            };

            if (isAdmin)
            {
                dto.AgendamentosPorProfissional = await ObterCargaProfissionalAsync(dataInicio, dataFim);
                dto.AuditoriaIA = await ObterAuditoriaIAAsync(dataInicio, dataFim);
            }

            return dto;
        }

        private async Task<List<EspecialidadeRankingDto>> ObterEspecialidadesAsync(DateTime inicio, DateTime fim, Guid? profId)
        {
            var queryAg = _db.Agendamentos.AsNoTracking()
                .Where(a => a.DataHoraConsulta >= inicio && a.DataHoraConsulta <= fim);
            if (profId.HasValue)
                queryAg = queryAg.Where(a => a.ProfissionalId == profId.Value);

            var profIds = await queryAg.Select(a => a.ProfissionalId).Distinct().ToListAsync();

            var especialidades = await _db.ProfissionalEspecialidades
                .AsNoTracking()
                .Where(pe => profIds.Contains(pe.ProfissionalId))
                .ToListAsync();

            var agrupado = especialidades
                .GroupBy(pe => pe.EspecialidadeId)
                .Select(g => new EspecialidadeRankingDto
                {
                    Nome = g.Key.ToString(),
                    Total = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .Take(10)
                .ToList();

            return agrupado;
        }

        private async Task<List<PacientesNovosVsRecorrentesDto>> ObterNovosVsRecorrentesAsync(DateTime inicio, DateTime fim, Guid? profId)
        {
            var query = _db.Agendamentos.AsNoTracking()
                .Where(a => a.DataHoraConsulta >= inicio && a.DataHoraConsulta <= fim);
            if (profId.HasValue)
                query = query.Where(a => a.ProfissionalId == profId.Value);

            var dados = await query.Select(a => new { a.PacienteId, a.DataHoraConsulta, a.DtCriado }).ToListAsync();

            var pacientesComPrimeiraConsulta = await _db.Agendamentos.AsNoTracking()
                .GroupBy(a => a.PacienteId)
                .Select(g => new { PacienteId = g.Key, Primeira = g.Min(a => a.DataHoraConsulta) })
                .ToListAsync();

            var dictPrimeira = pacientesComPrimeiraConsulta.ToDictionary(x => x.PacienteId, x => x.Primeira);

            var porMes = dados
                .GroupBy(a => new { a.DataHoraConsulta.Year, a.DataHoraConsulta.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g =>
                {
                    var mesInicio = new DateTime(g.Key.Year, g.Key.Month, 1);
                    var mesFim = mesInicio.AddMonths(1);
                    var pacientesDoMes = g.Select(x => x.PacienteId).Distinct().ToList();
                    int novos = 0, recorrentes = 0;
                    foreach (var pid in pacientesDoMes)
                    {
                        if (dictPrimeira.TryGetValue(pid, out var primeira) && primeira >= mesInicio && primeira < mesFim)
                            novos++;
                        else
                            recorrentes++;
                    }
                    return new PacientesNovosVsRecorrentesDto
                    {
                        Mes = $"{g.Key.Year}-{g.Key.Month:D2}",
                        Novos = novos,
                        Recorrentes = recorrentes
                    };
                }).ToList();

            return porMes;
        }

        private async Task<List<RiscoFaltaDto>> ObterTopRiscoFaltaAsync(DateTime inicio, DateTime fim, Guid? profId)
        {
            var query = _db.Agendamentos.AsNoTracking()
                .Include(a => a.Paciente)
                .Where(a => a.DataHoraConsulta >= inicio && a.DataHoraConsulta <= fim)
                .Where(a => a.Status == StatusAgendamento.Agendado);

            if (profId.HasValue)
                query = query.Where(a => a.ProfissionalId == profId.Value);

            var top = await query
                .OrderByDescending(a => a.ProbabilidadeFalta)
                .Take(5)
                .Select(a => new RiscoFaltaDto
                {
                    AgendamentoId = a.Id,
                    PacienteId = a.PacienteId,
                    NomePaciente = a.Paciente.Nome,
                    Probabilidade = a.ProbabilidadeFalta,
                    DataConsulta = a.DataHoraConsulta.ToString("yyyy-MM-dd HH:mm")
                })
                .ToListAsync();

            return top;
        }



        private async Task<List<ProfissionalCargaDto>> ObterCargaProfissionalAsync(DateTime inicio, DateTime fim)
        {
            return await _db.Agendamentos.AsNoTracking()
                .Where(a => a.DataHoraConsulta >= inicio && a.DataHoraConsulta <= fim)
                .Join(_db.Profissionais, a => a.ProfissionalId, p => p.Id, (a, p) => new { p.Id, p.Nome })
                .GroupBy(x => new { x.Id, x.Nome })
                .Select(g => new ProfissionalCargaDto { Id = g.Key.Id, Nome = g.Key.Nome, Total = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();
        }

        private async Task<AuditoriaIADto> ObterAuditoriaIAAsync(DateTime inicio, DateTime fim)
        {
            var violacoes = await _db.ViolacoesIA.AsNoTracking()
                .Where(v => v.DtCriado >= inicio && v.DtCriado <= fim)
                .ToListAsync();

            var bloqueados = await _db.Pacientes.AsNoTracking()
                .Where(p => p.BloqueadoIAAte.HasValue && p.BloqueadoIAAte.Value > DateTime.UtcNow)
                .CountAsync();

            return new AuditoriaIADto
            {
                TotalInjecoes = violacoes.Count(v => v.TipoViolacao == TipoViolacao.Injecao),
                TotalUsoIndevido = violacoes.Count(v => v.TipoViolacao == TipoViolacao.UsoIndevido),
                Bloqueados = bloqueados
            };
        }

        public async Task<DetalhesProfissionalDto> ObterDetalhesProfissionalAsync(Guid profissionalId, DateTime dataInicio, DateTime dataFim)
        {
            var agendamentos = await _db.Agendamentos.AsNoTracking()
                .Include(a => a.Paciente)
                .Where(a => a.ProfissionalId == profissionalId && a.DataHoraConsulta >= dataInicio && a.DataHoraConsulta <= dataFim)
                .OrderByDescending(a => a.DataHoraConsulta)
                .ToListAsync();

            var distribuicao = agendamentos
                .GroupBy(a => a.Status.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var ultimos = agendamentos
                .Take(5)
                .Select(a => new UltimoAgendamentoDto
                {
                    Data = a.DataHoraConsulta.ToString("dd/MM/yyyy HH:mm"),
                    Paciente = a.Paciente.Nome,
                    Status = a.Status.ToString()
                })
                .ToList();

            return new DetalhesProfissionalDto
            {
                DistribuicaoPorStatus = distribuicao,
                UltimosAgendamentos = ultimos
            };
        }

        private static readonly Dictionary<string, EspecialidadeMedica> _mapaEspecialidades = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Clínica Geral"] = EspecialidadeMedica.ClinicaGeral,
            ["ClinicaGeral"] = EspecialidadeMedica.ClinicaGeral,
            ["Medicina de Família"] = EspecialidadeMedica.MedicinaDeFamilia,
            ["MedicinaDeFamilia"] = EspecialidadeMedica.MedicinaDeFamilia,
            ["Pediatria"] = EspecialidadeMedica.Pediatria,
            ["Ginecologia e Obstetrícia"] = EspecialidadeMedica.GinecologiaEObstetricia,
            ["GinecologiaEObstetricia"] = EspecialidadeMedica.GinecologiaEObstetricia,
            ["Cardiologia"] = EspecialidadeMedica.Cardiologia,
            ["Dermatologia"] = EspecialidadeMedica.Dermatologia,
            ["Endocrinologia"] = EspecialidadeMedica.Endocrinologia,
            ["Gastroenterologia"] = EspecialidadeMedica.Gastroenterologia,
            ["Neurologia"] = EspecialidadeMedica.Neurologia,
            ["Ortopedia e Traumatologia"] = EspecialidadeMedica.OrtopediaETraumatologia,
            ["OrtopediaETraumatologia"] = EspecialidadeMedica.OrtopediaETraumatologia,
            ["Psiquiatria"] = EspecialidadeMedica.Psiquiatria,
            ["Otorrinolaringologia"] = EspecialidadeMedica.Otorrinolaringologia,
            ["Oftalmologia"] = EspecialidadeMedica.Oftalmologia,
            ["Urologia"] = EspecialidadeMedica.Urologia,
            ["Pneumologia"] = EspecialidadeMedica.Pneumologia,
            ["Reumatologia"] = EspecialidadeMedica.Reumatologia,
            ["Geriatria"] = EspecialidadeMedica.Geriatria,
            ["Medicina Esportiva"] = EspecialidadeMedica.MedicinaEsportiva,
            ["MedicinaEsportiva"] = EspecialidadeMedica.MedicinaEsportiva,
        };

        private static EspecialidadeMedica? MapearEspecialidade(string nome)
        {
            return _mapaEspecialidades.TryGetValue(nome, out var val) ? val : null;
        }
    }
}
