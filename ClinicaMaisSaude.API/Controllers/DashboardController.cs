using ClinicaMaisSaude.Application.DTOs.Dashboard;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [Authorize(Roles = PerfisUsuario.Medico + "," + PerfisUsuario.Enfermeira)]
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
            var isAdmin = User.FindFirstValue(ClinicaClaims.IsAdmin) == "true";
            Guid? profId = null;
            if (!isAdmin)
            {
                var profIdStr = User.FindFirstValue(ClinicaClaims.ProfissionalId);
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

        // ── EXCEL ───────────────────────────────────────────────────────────
        [HttpGet("exportar/excel")]
        public async Task<IActionResult> ExportarExcel([FromQuery] DateTime dataInicio, [FromQuery] DateTime dataFim, [FromQuery] string[]? status = null, [FromQuery] string[]? especialidades = null)
        {
            var (isAdmin, profIdToken) = ObterContextoUsuario();
            var filtroProf = isAdmin ? (Guid?)null : profIdToken;

            var bytes = await _dashboardService.GerarExcelAsync(dataInicio, dataFim, status, especialidades, filtroProf, isAdmin);
            var nomeArquivo = $"relatorio_{dataInicio:yyyyMMdd}_{dataFim:yyyyMMdd}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nomeArquivo);
        }

        // ── PDF ─────────────────────────────────────────────────────────────
        [HttpGet("exportar/pdf")]
        public async Task<IActionResult> ExportarPdf([FromQuery] DateTime dataInicio, [FromQuery] DateTime dataFim, [FromQuery] string[]? status = null, [FromQuery] string[]? especialidades = null)
        {
            var (isAdmin, profIdToken) = ObterContextoUsuario();
            var filtroProf = isAdmin ? (Guid?)null : profIdToken;

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = Guid.TryParse(userIdStr, out var parsed) ? parsed : null;
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "Usuário";

            var bytes = await _dashboardService.GerarPdfAsync(dataInicio, dataFim, status, especialidades, filtroProf, isAdmin, userId, role);
            var nomeArquivo = $"relatorio_{dataInicio:yyyyMMdd}_{dataFim:yyyyMMdd}.pdf";
            return File(bytes, "application/pdf", nomeArquivo);
        }
    }
}
