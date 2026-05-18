using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [Authorize(Roles = "Medico,Enfermeira")]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        private (bool isAdmin, Guid? profissionalId) ObterContextoUsuario()
        {
            var isAdmin = User.FindFirstValue("IsAdmin") == "true";
            Guid? profId = null;
            if (!isAdmin)
            {
                var profIdStr = User.FindFirstValue("ProfissionalId");
                if (Guid.TryParse(profIdStr, out var parsed))
                    profId = parsed;
            }
            return (isAdmin, profId);
        }

        [HttpGet("estatisticas")]
        public async Task<IActionResult> ObterEstatisticas(
            [FromQuery] DateTime dataInicio,
            [FromQuery] DateTime dataFim,
            [FromQuery] Guid? profissionalId = null,
            [FromQuery] string[]? status = null,
            [FromQuery] string[]? especialidades = null)
        {
            var (isAdmin, profIdToken) = ObterContextoUsuario();
            var filtroProf = isAdmin ? profissionalId : profIdToken;

            var dto = await _dashboardService.ObterEstatisticasAsync(dataInicio, dataFim, filtroProf, isAdmin, status, especialidades);

            return Ok(dto);
        }

        [HttpGet("profissional/{id}/detalhes")]
        public async Task<IActionResult> ObterDetalhesProfissional(
            Guid id,
            [FromQuery] DateTime dataInicio,
            [FromQuery] DateTime dataFim)
        {
            var (isAdmin, profIdToken) = ObterContextoUsuario();
            if (!isAdmin && profIdToken != id)
            {
                return Forbid();
            }

            var dto = await _dashboardService.ObterDetalhesProfissionalAsync(id, dataInicio, dataFim);
            return Ok(dto);
        }

        // ── Obter DTO reutilizável para exportação ──────────────────────────
        private async Task<DashboardEstatisticasDto> ObterDadosExportacao(DateTime dataInicio, DateTime dataFim, string[]? status, string[]? especialidades)
        {
            var (isAdmin, profIdToken) = ObterContextoUsuario();
            var filtroProf = isAdmin ? (Guid?)null : profIdToken;

            return await _dashboardService.ObterEstatisticasAsync(dataInicio, dataFim, filtroProf, isAdmin, status, especialidades);
        }

        private string MontarTextoFiltros(string[]? status, string[]? especialidades)
        {
            var parts = new List<string>();
            if (status != null && status.Length > 0) parts.Add($"Status: {string.Join(", ", status)}");
            if (especialidades != null && especialidades.Length > 0) parts.Add($"Especialidades: {string.Join(", ", especialidades)}");
            return parts.Count > 0 ? string.Join(" | ", parts) : "";
        }

        // ── EXCEL ───────────────────────────────────────────────────────────
        [HttpGet("exportar/excel")]
        public async Task<IActionResult> ExportarExcel([FromQuery] DateTime dataInicio, [FromQuery] DateTime dataFim, [FromQuery] string[]? status = null, [FromQuery] string[]? especialidades = null)
        {
            var (isAdmin, _) = ObterContextoUsuario();
            var dto = await ObterDadosExportacao(dataInicio, dataFim, status, especialidades);

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

            // Aba 5 — Risco de Falta
            var wsRisco = workbook.Worksheets.Add("Risco de Falta");
            wsRisco.Cell(1, 1).Value = "Paciente";
            wsRisco.Cell(1, 2).Value = "Probabilidade (%)";
            wsRisco.Cell(1, 3).Value = "Data Consulta";
            for (int i = 0; i < dto.TopRiscoFalta.Count; i++)
            {
                wsRisco.Cell(i + 2, 1).Value = dto.TopRiscoFalta[i].NomePaciente;
                wsRisco.Cell(i + 2, 2).Value = Math.Round(dto.TopRiscoFalta[i].Probabilidade * 100, 1);
                wsRisco.Cell(i + 2, 3).Value = dto.TopRiscoFalta[i].DataConsulta;
            }
            wsRisco.Columns().AdjustToContents();

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
            stream.Position = 0;
            var nomeArquivo = $"relatorio_{dataInicio:yyyyMMdd}_{dataFim:yyyyMMdd}.xlsx";
            return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nomeArquivo);
        }

        // ── PDF ─────────────────────────────────────────────────────────────
        [HttpGet("exportar/pdf")]
        public async Task<IActionResult> ExportarPdf([FromQuery] DateTime dataInicio, [FromQuery] DateTime dataFim, [FromQuery] string[]? status = null, [FromQuery] string[]? especialidades = null)
        {
            var (isAdmin, _) = ObterContextoUsuario();
            var dto = await ObterDadosExportacao(dataInicio, dataFim, status, especialidades);

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

                        // Risco de Falta
                        col.Item().Text("Top 5 Risco de Falta").Bold().FontSize(13);
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(); c.RelativeColumn(); });
                            table.Header(h =>
                            {
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Paciente").Bold();
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Prob. (%)").Bold();
                                h.Cell().Background(Colors.Purple.Lighten4).Padding(4).Text("Data").Bold();
                            });
                            foreach (var r in dto.TopRiscoFalta)
                            {
                                table.Cell().Padding(3).Text(r.NomePaciente);
                                table.Cell().Padding(3).Text($"{Math.Round(r.Probabilidade * 100, 1)}%");
                                table.Cell().Padding(3).Text(r.DataConsulta);
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

            var pdfBytes = document.GeneratePdf();
            var nomeArquivo = $"relatorio_{dataInicio:yyyyMMdd}_{dataFim:yyyyMMdd}.pdf";
            return File(pdfBytes, "application/pdf", nomeArquivo);
        }
    }
}
