using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Reports;
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
            dataFim = dataFim.Date.AddDays(1).AddTicks(-1);

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
            
            // Fluxo de exames é uma métrica geral da clínica (unfiltered by professional)
            var queryExamesBase = _db.Agendamentos
                .AsNoTracking()
                .Where(a => a.DataHoraConsulta >= dataInicio && a.DataHoraConsulta <= dataFim 
                            && a.TipoConsulta == TipoConsulta.Exame 
                            && a.Status != StatusAgendamento.Cancelado);

            var totalExames = await queryExamesBase.CountAsync();
            var liberados = await queryExamesBase.CountAsync(a => a.ResultadoDisponivel || (a.Status == StatusAgendamento.Finalizado && !a.ExigeResultadoPosterior));
            var pendentes = await queryExamesBase.CountAsync(a => a.ExigeResultadoPosterior && !a.ResultadoDisponivel);

            var dto = new DashboardEstatisticasDto
            {
                TotalAgendamentos = totalAgendamentos,
                AgendamentosPorStatus = statusList.ToDictionary(x => x.Status.ToString(), x => x.Total),
                AgendamentosPorDia = diasList.Select(x => new AgendamentoPorDiaDto { Data = x.Data.ToString("dd/MM/yyyy"), Total = x.Total }).ToList(),
                EspecialidadesMaisProcuradas = await ObterEspecialidadesAsync(dataInicio, dataFim, filtroProf),
                TaxaAbsenteismo = totalAgendamentos > 0 ? Math.Round((decimal)faltasCount / totalAgendamentos * 100, 2) : 0,
                PacientesNovosVsRecorrentes = await ObterNovosVsRecorrentesAsync(dataInicio, dataFim, filtroProf),

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

            var agendamentos = await queryAg
                .Select(a => new { a.EspecialidadeId, a.ProfissionalId })
                .ToListAsync();

            var profEspecialidades = await _db.ProfissionalEspecialidades
                .AsNoTracking()
                .Select(pe => new { pe.ProfissionalId, pe.EspecialidadeId })
                .ToListAsync();

            var profEspDict = profEspecialidades
                .GroupBy(pe => pe.ProfissionalId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(pe => pe.EspecialidadeId).FirstOrDefault()
                );

            var agrupado = agendamentos
                .Select(a =>
                {
                    if (a.EspecialidadeId.HasValue)
                        return (EspecialidadeMedica?)a.EspecialidadeId.Value;
                    if (profEspDict.TryGetValue(a.ProfissionalId, out var esp))
                        return esp;
                    return null;
                })
                .Where(e => e.HasValue)
                .GroupBy(e => e!.Value)
                .Select(g => new EspecialidadeRankingDto
                {
                    Nome = FormatarNomeEspecialidade(g.Key),
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





        private async Task<List<ProfissionalCargaDto>> ObterCargaProfissionalAsync(DateTime inicio, DateTime fim)
        {
            return await _db.Agendamentos.AsNoTracking()
                .Where(a => a.DataHoraConsulta >= inicio && a.DataHoraConsulta <= fim)
                .Join(_db.Profissionais, a => a.ProfissionalId, p => p.Id, (a, p) => new { p.Id, Nome = p.Pessoa!.Nome })
                .GroupBy(x => new { x.Id, x.Nome })
                .Select(g => new ProfissionalCargaDto { Id = g.Key.Id, Nome = g.Key.Nome, Total = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();
        }

        private async Task<AuditoriaIADto> ObterAuditoriaIAAsync(DateTime inicio, DateTime fim)
        {
            var violacoes = await _db.UsoInadequadoIA.AsNoTracking()
                .Where(v => v.DtCriado >= inicio && v.DtCriado <= fim)
                .ToListAsync();

            // Penalidade de IA agora vive no LoginPortal (Fase 6).
            var bloqueados = await _db.Usuarios.AsNoTracking()
                .Where(u => u.BloqueadoIAAte.HasValue && u.BloqueadoIAAte.Value > DateTime.UtcNow)
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
            dataFim = dataFim.Date.AddDays(1).AddTicks(-1);

            var agendamentos = await _db.Agendamentos.AsNoTracking()
                .Include(a => a.Paciente).ThenInclude(p => p.Usuario)
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
                    Paciente = a.Paciente.Pessoa!.Nome,
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

        private static string FormatarNomeEspecialidade(EspecialidadeMedica e) => e switch
        {
            EspecialidadeMedica.ClinicaGeral => "Clínica Geral",
            EspecialidadeMedica.MedicinaDeFamilia => "Medicina de Família",
            EspecialidadeMedica.Pediatria => "Pediatria",
            EspecialidadeMedica.GinecologiaEObstetricia => "Ginecologia e Obstetrícia",
            EspecialidadeMedica.Cardiologia => "Cardiologia",
            EspecialidadeMedica.Dermatologia => "Dermatologia",
            EspecialidadeMedica.Endocrinologia => "Endocrinologia",
            EspecialidadeMedica.Gastroenterologia => "Gastroenterologia",
            EspecialidadeMedica.Neurologia => "Neurologia",
            EspecialidadeMedica.OrtopediaETraumatologia => "Ortopedia e Traumatologia",
            EspecialidadeMedica.Psiquiatria => "Psiquiatria",
            EspecialidadeMedica.Otorrinolaringologia => "Otorrinolaringologia",
            EspecialidadeMedica.Oftalmologia => "Oftalmologia",
            EspecialidadeMedica.Urologia => "Urologia",
            EspecialidadeMedica.Pneumologia => "Pneumologia",
            EspecialidadeMedica.Reumatologia => "Reumatologia",
            EspecialidadeMedica.Geriatria => "Geriatria",
            EspecialidadeMedica.MedicinaEsportiva => "Medicina Esportiva",
            _ => e.ToString()
        };

        private string MontarTextoFiltros(string[]? status, string[]? especialidades)
        {
            var parts = new List<string>();
            if (status != null && status.Length > 0) parts.Add($"Status: {string.Join(", ", status)}");
            if (especialidades != null && especialidades.Length > 0) parts.Add($"Especialidades: {string.Join(", ", especialidades)}");
            return parts.Count > 0 ? string.Join(" | ", parts) : "";
        }

        public async Task<byte[]> GerarExcelAsync(DateTime dataInicio, DateTime dataFim, string[]? status = null, string[]? especialidades = null, Guid? profissionalId = null, bool isAdmin = true)
        {
            var dto = await ObterEstatisticasAsync(dataInicio, dataFim, profissionalId, isAdmin, status, especialidades);
            return DashboardExcelReport.Gerar(dto, dataInicio, dataFim, MontarTextoFiltros(status, especialidades), isAdmin);
        }

        public async Task<byte[]> GerarPdfAsync(DateTime dataInicio, DateTime dataFim, string[]? status = null, string[]? especialidades = null, Guid? profissionalId = null, bool isAdmin = true, Guid? usuarioId = null, string role = "Usuário")
        {
            var dto = await ObterEstatisticasAsync(dataInicio, dataFim, profissionalId, isAdmin, status, especialidades);

            string nomeUsuario = isAdmin ? "Administrador" : "Desconhecido";
            if (!isAdmin && usuarioId.HasValue)
            {
                var prof = await _db.Profissionais.AsNoTracking().Include(p => p.Pessoa).FirstOrDefaultAsync(p => p.UsuarioId == usuarioId.Value);
                if (prof?.Pessoa != null) nomeUsuario = prof.Pessoa.Nome;
            }

            return DashboardPdfReport.Gerar(dto, dataInicio, dataFim, MontarTextoFiltros(status, especialidades), isAdmin, nomeUsuario, role);
        }
    }
}
