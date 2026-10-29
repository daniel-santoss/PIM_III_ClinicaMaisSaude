using ClinicaMaisSaude.Application.DTOs.Profissional;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class ProfissionalService : IProfissionalService
    {
        private readonly ClinicaDbContext _context;

        public ProfissionalService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<object?> ObterPorIdAsync(Guid id)
        {
            var prof = await _context.Profissionais
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (prof == null) return null;

            return new
            {
                prof.Id,
                // Identidade a partir da Pessoa (fonte única — Thread B).
                Nome = prof.Pessoa?.Nome,
                prof.Crm,
                prof.UfCrm,
                // Categoria do profissional a partir do papel unificado (Role é a fonte única — Fase A3b).
                TipoProfissional = prof.Usuario?.Role.ToString(),
                Email = prof.Pessoa?.Email,
                Escala = (int)prof.Escala,
                prof.InicioPlantoes
            };
        }

        // Edição cadastral do profissional (tela de usuários). A identidade vive na
        // Pessoa (fonte única), então atualizamos lá — espelha PacienteService.AtualizarAsync.
        // O CPF é inalterável.
        public async Task<object> AtualizarAsync(Guid id, ProfissionalUpdateRequest request)
        {
            var prof = await _context.Profissionais
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == id)
                ?? throw new NotFoundException("Profissional não encontrado.");

            if (prof.Pessoa != null)
            {
                if (!string.IsNullOrWhiteSpace(request.Nome))
                    prof.Pessoa.AtualizarNome(request.Nome);
                if (!string.IsNullOrWhiteSpace(request.Email))
                    prof.Pessoa.AtualizarEmail(request.Email.Trim().ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(request.Telefone))
                    prof.Pessoa.AtualizarTelefone(request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", ""));
            }

            if (request.InicioPlantoes.HasValue && request.InicioPlantoes.Value.Date != prof.InicioPlantoes)
            {
                var novoInicio = request.InicioPlantoes.Value.Date;
                var novaEscala = Expediente.EscalaDoDia(novoInicio);

                // Mudar o primeiro plantão redefine todos os dias de plantão: as consultas já agendadas
                // que cairiam antes do novo início ou num dia da outra escala precisam ser remarcadas
                // antes (senão o paciente fica sem profissional). As ausências ficam guardadas: só
                // valem nos dias de plantão, então as que caírem fora simplesmente deixam de ter efeito.
                var hoje = DateTime.UtcNow.AddHours(-3).Date;
                var datasFuturas = await _context.Agendamentos.AsNoTracking()
                    .Where(a => a.ProfissionalId == prof.Id && a.Status == StatusAgendamento.Agendado && a.DataHoraConsulta >= hoje)
                    .Select(a => a.DataHoraConsulta)
                    .ToListAsync();
                var foraDosNovosPlantoes = datasFuturas.Count(d => d.Date < novoInicio || Expediente.EscalaDoDia(d) != novaEscala);
                if (foraDosNovosPlantoes > 0)
                    throw new BusinessRuleException($"Não é possível mudar o primeiro plantão: {foraDosNovosPlantoes} consulta(s) agendada(s) ficaria(m) fora dos novos plantões. Remarque-as antes.");

                prof.DefinirInicioPlantoes(novoInicio);
            }

            await _context.SaveChangesAsync();

            return new
            {
                prof.Id,
                Nome = prof.Pessoa?.Nome,
                Cpf = prof.Pessoa?.Cpf,
                Telefone = prof.Pessoa?.Telefone,
                Email = prof.Pessoa?.Email,
                TipoProfissional = prof.Usuario?.Role.ToString(),
                Escala = (int)prof.Escala,
                prof.InicioPlantoes
            };
        }
    }
}
