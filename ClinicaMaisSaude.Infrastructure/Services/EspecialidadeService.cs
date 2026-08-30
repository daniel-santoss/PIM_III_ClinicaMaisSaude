using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class EspecialidadeService : IEspecialidadeService
    {
        private readonly ClinicaDbContext _context;

        public EspecialidadeService(ClinicaDbContext context)
        {
            _context = context;
        }

        public List<object> ListarTodas()
        {
            return Enum.GetValues<EspecialidadeMedica>()
                .Select(e => (object)new { id = (int)e, nome = FormatarNome(e) })
                .ToList();
        }

        public async Task<List<int>> ListarDisponiveisAsync()
        {
            return await _context.ProfissionalEspecialidades
                .AsNoTracking()
                .Select(pe => (int)pe.EspecialidadeId)
                .Distinct()
                .ToListAsync();
        }

        public async Task<object?> ObterMinhasAsync(Guid profissionalId)
        {
            var prof = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.Id == profissionalId);

            if (prof == null) return null;
            if (EhEnfermeira(prof))
                throw new BusinessRuleException("Enfermeiras não possuem especialidades.");

            return prof.Especialidades
                .Select(e => new { id = (int)e.EspecialidadeId, nome = FormatarNome(e.EspecialidadeId) })
                .ToList();
        }

        public async Task<object?> AtualizarMinhasAsync(Guid profissionalId, List<int> especialidadeIds)
        {
            var prof = await _context.Profissionais
                .Include(p => p.Usuario)
                .Include(p => p.Especialidades)
                .FirstOrDefaultAsync(p => p.Id == profissionalId);

            if (prof == null) return null;
            if (EhEnfermeira(prof))
                throw new BusinessRuleException("Enfermeiras não possuem especialidades.");

            var validos = Enum.GetValues<EspecialidadeMedica>().Cast<int>().ToHashSet();
            var idsValidos = especialidadeIds.Where(id => validos.Contains(id)).Distinct().ToList();

            if (idsValidos.Count > 2)
            {
                throw new BusinessRuleException("Médicos podem ter no máximo 2 especialidades.");
            }

            prof.Especialidades.Clear();
            foreach (var id in idsValidos)
            {
                prof.Especialidades.Add(new ProfissionalEspecialidade(prof.Id, (EspecialidadeMedica)id));
            }

            await _context.SaveChangesAsync();
            return prof.Especialidades.Select(e => new { id = (int)e.EspecialidadeId, nome = FormatarNome(e.EspecialidadeId) });
        }

        // Categoria do profissional a partir do papel unificado (Role é a fonte única — Fase A3b).
        private static bool EhEnfermeira(Profissional prof) =>
            prof.Usuario?.Role == RoleUsuario.Enfermeira;

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
            EspecialidadeMedica.MedicinaEsportiva => "Medicina Esportiva",
            _ => e.ToString()
        };
    }
}
