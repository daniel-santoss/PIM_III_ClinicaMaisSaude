using ClinicaMaisSaude.Application.DTOs.Dashboard;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClinicaMaisSaude.Infrastructure.Reports
{
    /// <summary>
    /// Gerador do relatório do dashboard em PDF (QuestPDF). Formatador PURO: recebe o DTO já
    /// calculado + metadados (período, filtros, usuário) e devolve os bytes do PDF — não toca
    /// no banco. Extraído do DashboardService para separar "gerar relatório" de "consultar" (SRP).
    /// </summary>
    internal static class DashboardPdfReport
    {
        public static byte[] Gerar(
            DashboardEstatisticasDto dto,
            System.DateTime dataInicio,
            System.DateTime dataFim,
            string textoFiltros,
            bool isAdmin,
            string nomeUsuario,
            string role)
        {
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
                        if (!string.IsNullOrEmpty(textoFiltros))
                        {
                            col.Item().Text($"Filtros: {textoFiltros}").FontSize(10).FontColor(Colors.Grey.Medium);
                        }

                        col.Item().Text($"Gerado em: {System.DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8).FontColor(Colors.Grey.Medium);
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
