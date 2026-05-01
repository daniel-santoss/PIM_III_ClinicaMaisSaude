using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EspecialidadesController : ControllerBase
    {
        private readonly ClinicaDbContext _context;

        public EspecialidadesController(ClinicaDbContext context)
        {
            _context = context;
        }

        [HttpGet("lista")]
        [AllowAnonymous]
        public IActionResult ListarTodas()
        {
            var lista = Enum.GetValues<EspecialidadeMedica>()
                .Select(e => new { id = (int)e, nome = FormatarNome(e) })
                .ToList();
            return Ok(lista);
        }

        [HttpGet("minhas")]
        public async Task<IActionResult> ObterMinhas()
        {
            var profissionalId = ObterProfissionalId();
            if (profissionalId == null)
                return Forbid("Apenas profissionais podem acessar especialidades.");

            var prof = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.Id == profissionalId.Value);

            if (prof == null) return NotFound();
            if (prof.TipoProfissional == TipoProfissional.Enfermeira)
                return BadRequest("Enfermeiras não possuem especialidades.");

            var resultado = prof.Especialidades
                .Select(e => new { id = (int)e.EspecialidadeId, nome = FormatarNome(e.EspecialidadeId) })
                .ToList();

            return Ok(resultado);
        }

        [HttpPut("minhas")]
        public async Task<IActionResult> AtualizarMinhas([FromBody] List<int> especialidadeIds)
        {
            var profissionalId = ObterProfissionalId();
            if (profissionalId == null)
                return Forbid("Apenas profissionais podem acessar especialidades.");

            var prof = await _context.Profissionais
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.Id == profissionalId.Value);

            if (prof == null) return NotFound();
            if (prof.TipoProfissional == TipoProfissional.Enfermeira)
                return BadRequest("Enfermeiras não possuem especialidades.");

            var validos = Enum.GetValues<EspecialidadeMedica>().Cast<int>().ToHashSet();
            var idsValidos = especialidadeIds.Where(id => validos.Contains(id)).Distinct().ToList();

            prof.Especialidades.Clear();
            foreach (var id in idsValidos)
            {
                prof.Especialidades.Add(new ProfissionalEspecialidade(prof.Id, (EspecialidadeMedica)id));
            }

            await _context.SaveChangesAsync();
            return Ok(prof.Especialidades.Select(e => new { id = (int)e.EspecialidadeId, nome = FormatarNome(e.EspecialidadeId) }));
        }

        private Guid? ObterProfissionalId()
        {
            var claim = User.FindFirst("ProfissionalId")?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private static string FormatarNome(EspecialidadeMedica e) => e switch
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
            EspecialidadeMedica.MedicinaDoTrabalho => "Medicina do Trabalho",
            EspecialidadeMedica.MedicinaEsportiva => "Medicina Esportiva",
            EspecialidadeMedica.Acupuntura => "Acupuntura",
            EspecialidadeMedica.AnalisesClinicas => "Análises Clínicas",
            EspecialidadeMedica.Radiologia => "Radiologia",
            EspecialidadeMedica.DiagnosticoPorImagem => "Diagnóstico por Imagem",
            _ => e.ToString()
        };
    }
}
