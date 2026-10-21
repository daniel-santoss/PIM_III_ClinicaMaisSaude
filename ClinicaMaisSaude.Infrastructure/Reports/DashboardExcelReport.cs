using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClosedXML.Excel;
using System.IO;

namespace ClinicaMaisSaude.Infrastructure.Reports
{
    /// <summary>
    /// Gerador do relatório do dashboard em Excel (ClosedXML). Formatador PURO: recebe o
    /// DTO já calculado + metadados e devolve os bytes da planilha — não toca no banco.
    /// Extraído do DashboardService para separar "gerar relatório" de "consultar dados" (SRP).
    /// </summary>
    internal static class DashboardExcelReport
    {
        public static byte[] Gerar(
            DashboardEstatisticasDto dto,
            System.DateTime dataInicio,
            System.DateTime dataFim,
            string textoFiltros,
            bool isAdmin)
        {
            using var workbook = new XLWorkbook();

            // Aba 1 — Resumo Geral
            var wsResumo = workbook.Worksheets.Add("Resumo Geral");
            int row = 1;
            wsResumo.Cell(row, 1).Value = "Período";
            wsResumo.Cell(row, 2).Value = $"{dataInicio:dd/MM/yyyy} - {dataFim:dd/MM/yyyy}";
            row++;
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

            // Aba 5 — Auditoria IA (Admin only)
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
    }
}
