using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
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
            dataFim = dataFim.Date.AddDays(1).AddTicks(-1);

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

            using var workbook = new XLWorkbook();

            // Aba 1 — Resumo Geral
            var wsResumo = workbook.Worksheets.Add("Resumo Geral");
            int row = 1;
            wsResumo.Cell(row, 1).Value = "Período";
            wsResumo.Cell(row, 2).Value = $"{dataInicio:dd/MM/yyyy} - {dataFim:dd/MM/yyyy}";
            row++;
            var textoFiltros = MontarTextoFiltros(status, especialidades);
            if (!string.IsNullOrEmpty(textoFiltros))
            {
                wsResumo.Cell(row, 1).Value = "Filtros aplicados";
                wsResumo.Cell(row, 2).Value = textoFiltros;
                row++;
            }
            row++;
            wsResumo.Cell(row, 1).Value = "Indicador";
            wsResumo.Cell(row, 2).Value = "Valor";
            row++;
            wsResumo.Cell(row, 1).Value = "Total de Agendamentos";
            wsResumo.Cell(row, 2).Value = dto.TotalAgendamentos;
            row++;
            wsResumo.Cell(row, 1).Value = "Taxa de Absenteísmo (%)";
            wsResumo.Cell(row, 2).Value = (double)dto.TaxaAbsenteismo;
            row++;
            wsResumo.Cell(row, 1).Value = "Exames - Total";
            wsResumo.Cell(row, 2).Value = dto.FluxoExames.Total;
            row++;
            wsResumo.Cell(row, 1).Value = "Exames - Liberados";
            wsResumo.Cell(row, 2).Value = dto.FluxoExames.Liberados;
            row++;
            wsResumo.Cell(row, 1).Value = "Exames - Pendentes";
            wsResumo.Cell(row, 2).Value = dto.FluxoExames.Pendentes;
            row++;
            foreach (var kv in dto.AgendamentosPorStatus)
            {
                wsResumo.Cell(row, 1).Value = $"Status: {kv.Key}";
                wsResumo.Cell(row, 2).Value = kv.Value;
                row++;
            }
            wsResumo.Columns().AdjustToContents();

            // Aba 2 — Agendamentos por Dia
            var wsDia = workbook.Worksheets.Add("Agendamentos por Dia");
            wsDia.Cell(1, 1).Value = "Data";
            wsDia.Cell(1, 2).Value = "Total";
            for (int i = 0; i < dto.AgendamentosPorDia.Count; i++)
            {
                wsDia.Cell(i + 2, 1).Value = dto.AgendamentosPorDia[i].Data;
                wsDia.Cell(i + 2, 2).Value = dto.AgendamentosPorDia[i].Total;
            }
            wsDia.Columns().AdjustToContents();

            // Aba 3 — Especialidades
            var wsEsp = workbook.Worksheets.Add("Especialidades");
            wsEsp.Cell(1, 1).Value = "Especialidade";
            wsEsp.Cell(1, 2).Value = "Total";
            for (int i = 0; i < dto.EspecialidadesMaisProcuradas.Count; i++)
            {
                wsEsp.Cell(i + 2, 1).Value = dto.EspecialidadesMaisProcuradas[i].Nome;
                wsEsp.Cell(i + 2, 2).Value = dto.EspecialidadesMaisProcuradas[i].Total;
            }
            wsEsp.Columns().AdjustToContents();

            // Aba 4 — Profissionais (Admin only)
            if (isAdmin && dto.AgendamentosPorProfissional != null)
            {
                var wsProf = workbook.Worksheets.Add("Profissionais");
                wsProf.Cell(1, 1).Value = "Profissional";
                wsProf.Cell(1, 2).Value = "Total";
                for (int i = 0; i < dto.AgendamentosPorProfissional.Count; i++)
                {
                    wsProf.Cell(i + 2, 1).Value = dto.AgendamentosPorProfissional[i].Nome;
                    wsProf.Cell(i + 2, 2).Value = dto.AgendamentosPorProfissional[i].Total;
                }
                wsProf.Columns().AdjustToContents();
            }

            // Aba 6 — Auditoria IA (Admin only)
            if (isAdmin && dto.AuditoriaIA != null)
            {
                var wsAudit = workbook.Worksheets.Add("Auditoria IA");
                wsAudit.Cell(1, 1).Value = "Indicador";
                wsAudit.Cell(1, 2).Value = "Valor";
                wsAudit.Cell(2, 1).Value = "Total Injeções";
                wsAudit.Cell(2, 2).Value = dto.AuditoriaIA.TotalInjecoes;
                wsAudit.Cell(3, 1).Value = "Total Uso Indevido";
                wsAudit.Cell(3, 2).Value = dto.AuditoriaIA.TotalUsoIndevido;
                wsAudit.Cell(4, 1).Value = "Bloqueados Atualmente";
                wsAudit.Cell(4, 2).Value = dto.AuditoriaIA.Bloqueados;
                wsAudit.Columns().AdjustToContents();
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public async Task<byte[]> GerarPdfAsync(DateTime dataInicio, DateTime dataFim, string[]? status = null, string[]? especialidades = null, Guid? profissionalId = null, bool isAdmin = true, Guid? usuarioId = null, string role = "Usuário")
        {
            var dto = await ObterEstatisticasAsync(dataInicio, dataFim, profissionalId, isAdmin, status, especialidades);

            string nomeUsuario = isAdmin ? "Administrador" : "Desconhecido";
            if (!isAdmin && usuarioId.HasValue)
            {
                var prof = await _db.Profissionais.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == usuarioId.Value);
                if (prof != null) nomeUsuario = prof.Nome;
            }

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    page.Header().Column(col =>
                    {
                        col.Item().Text("Clínica Mais Saúde").Bold().FontSize(18).FontColor(Colors.Purple.Medium);
                        col.Item().Text($"Relatório: {dataInicio:dd/MM/yyyy} - {dataFim:dd/MM/yyyy}").FontSize(10).FontColor(Colors.Grey.Medium);
                        var textoFiltrosPdf = MontarTextoFiltros(status, especialidades);
                        if (!string.IsNullOrEmpty(textoFiltrosPdf))
                        {
                            col.Item().Text($"Filtros: {textoFiltrosPdf}").FontSize(10).FontColor(Colors.Grey.Medium);
                        }
                        
                        col.Item().Text($"Gerado em: {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8).FontColor(Colors.Grey.Medium);
                        col.Item().Text($"Usuário: {nomeUsuario} ({role})").FontSize(8).FontColor(Colors.Grey.Medium);
                        col.Item().PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Purple.Lighten3);
                    });

                    page.Content().Column(col =>
                    {
                        // Resumo
                        col.Item().Text("Resumo Geral").Bold().FontSize(13);
                        col.Item().PaddingBottom(4).Text($"Total de Agendamentos: {dto.TotalAgendamentos}");
                        col.Item().PaddingBottom(4).Text($"Taxa de Absenteísmo: {dto.TaxaAbsenteismo}%");
                        foreach (var kv in dto.AgendamentosPorStatus)
                            col.Item().Text($"  {kv.Key}: {kv.Value}");
                        col.Item().PaddingVertical(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                        // Agendamentos por Dia
                        col.Item().Text("Agendamentos por Dia").Bold().FontSize(13);
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); });
                            table.Header(h =>
                            {
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Data").Bold();
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Total").Bold();
                            });
                            foreach (var d in dto.AgendamentosPorDia)
                            {
                                table.Cell().Padding(3).Text(d.Data);
                                table.Cell().Padding(3).Text(d.Total.ToString());
                            }
                        });
                        col.Item().PaddingVertical(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                        // Especialidades
                        col.Item().Text("Especialidades Mais Procuradas").Bold().FontSize(13);
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(); });
                            table.Header(h =>
                            {
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Especialidade").Bold();
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Total").Bold();
                            });
                            foreach (var e in dto.EspecialidadesMaisProcuradas)
                            {
                                table.Cell().Padding(3).Text(e.Nome);
                                table.Cell().Padding(3).Text(e.Total.ToString());
                            }
                        });
                        col.Item().PaddingVertical(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                        // Fluxo de Exames
                        col.Item().Text("Fluxo de Exames").Bold().FontSize(13);
                        col.Item().PaddingBottom(2).Text($"Total: {dto.FluxoExames.Total}  |  Liberados: {dto.FluxoExames.Liberados}  |  Pendentes: {dto.FluxoExames.Pendentes}");
                        col.Item().PaddingVertical(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                        // Profissionais (Admin only)
                        if (isAdmin && dto.AgendamentosPorProfissional != null)
                        {
                            col.Item().Text("Carga por Profissional").Bold().FontSize(13);
                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(); });
                                table.Header(h =>
                                {
                                    h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Profissional").Bold();
                                    h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Total").Bold();
                                });
                                foreach (var p in dto.AgendamentosPorProfissional)
                                {
                                    table.Cell().Padding(3).Text(p.Nome);
                                    table.Cell().Padding(3).Text(p.Total.ToString());
                                }
                            });
                            col.Item().PaddingVertical(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
                        }

                        // Auditoria IA (Admin only)
                        if (isAdmin && dto.AuditoriaIA != null)
                        {
                            col.Item().Text("Auditoria IA").Bold().FontSize(13);
                            col.Item().Text($"Injeções: {dto.AuditoriaIA.TotalInjecoes}  |  Uso Indevido: {dto.AuditoriaIA.TotalUsoIndevido}  |  Bloqueados: {dto.AuditoriaIA.Bloqueados}");
                        }
                    });

                    page.Footer().AlignCenter().Text("© 2026 Clínica Mais Saúde").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });

            return document.GeneratePdf();
        }
    }
}
