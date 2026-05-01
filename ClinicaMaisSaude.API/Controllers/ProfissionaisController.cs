using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfissionaisController : ControllerBase
    {
        private readonly ClinicaDbContext _context;

        public ProfissionaisController(ClinicaDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(Guid id)
        {
            var prof = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (prof == null) return NotFound("Profissional não encontrado.");

            return Ok(new
            {
                prof.Id,
                prof.Nome,
                prof.Crm,
                prof.UfCrm,
                TipoProfissional = prof.TipoProfissional.ToString(),
                Email = prof.Usuario?.Email
            });
        }
    }
}
