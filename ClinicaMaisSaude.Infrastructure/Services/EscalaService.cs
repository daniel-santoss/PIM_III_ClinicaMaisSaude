using ClinicaMaisSaude.Application.DTOs.Escala;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Controle da escala 12x36 (tela do admin). A escala do dia é calculada
    /// (<see cref="Expediente.EscalaDoDia"/>); o que fica no banco é só a escala de cada profissional
    /// e as ausências pontuais. "Consultas a remarcar" são as agendadas com um profissional que não
    /// está de plantão no dia: ausente, ou de outra escala (troca de escala ou dados antigos).
    /// </summary>
    public class EscalaService : IEscalaService
    {
        private const string MotivoAusencia = "Ausência";
        private const string MotivoForaDaEscala = "Fora da escala";

        private readonly ClinicaDbContext _context;

        public EscalaService(ClinicaDbContext context)
        {
            _context = context;
        }

        // Fuso de Brasília, como no cálculo dos horários da agenda.
        private static DateTime Hoje => DateTime.UtcNow.AddHours(-3).Date;

        public async Task<EscalaMesResponse> ObterMesAsync(int ano, int mes)
        {
            if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100)
                throw new ValidationException("Mês inválido.");

            var inicio = new DateTime(ano, mes, 1);
            var fim = inicio.AddMonths(1);

            var profissionais = await CarregarProfissionaisAtivosAsync();
            var ausencias = await _context.AusenciasProfissional.AsNoTracking()
                .Where(a => a.Data >= inicio && a.Data < fim)
                .Select(a => new { a.ProfissionalId, a.Data })
                .ToListAsync();
            var consultas = await _context.Agendamentos.AsNoTracking()
                .Where(a => a.Status == StatusAgendamento.Agendado && a.DataHoraConsulta >= inicio && a.DataHoraConsulta < fim)
                .Select(a => new { a.ProfissionalId, a.DataHoraConsulta })
                .ToListAsync();

            var escalaPorProfissional = profissionais.ToDictionary(p => p.Id, p => p.Escala);
            var resposta = new EscalaMesResponse { Ano = ano, Mes = mes };

            for (var dia = inicio; dia < fim; dia = dia.AddDays(1))
            {
                var escala = Expediente.EscalaDoDia(dia);
                var ausentes = ausencias.Where(a => a.Data == dia).Select(a => a.ProfissionalId).ToHashSet();
                var dePlantao = profissionais.Where(p => p.Escala == escala && !ausentes.Contains(p.Id)).ToList();

                var aRemarcar = dia < Hoje ? 0 : consultas.Count(c => c.DataHoraConsulta.Date == dia &&
                    (ausentes.Contains(c.ProfissionalId) ||
                     (escalaPorProfissional.TryGetValue(c.ProfissionalId, out var e) && e != escala)));

                resposta.Dias.Add(new EscalaDiaResumo
                {
                    Data = dia,
                    Escala = (int)escala,
                    Medicos = dePlantao.Count(p => p.Usuario.Role == RoleUsuario.Medico),
                    Enfermeiras = dePlantao.Count(p => p.Usuario.Role == RoleUsuario.Enfermeira),
                    Ausencias = ausentes.Count,
                    ConsultasARemarcar = aRemarcar
                });
            }

            foreach (var escala in Enum.GetValues<EscalaTrabalho>())
            {
                var daEscala = profissionais.Where(p => p.Escala == escala).ToList();
                resposta.Composicao.Add(new ComposicaoEscala
                {
                    Escala = (int)escala,
                    Medicos = daEscala.Count(p => p.Usuario.Role == RoleUsuario.Medico),
                    Enfermeiras = daEscala.Count(p => p.Usuario.Role == RoleUsuario.Enfermeira)
                });
            }

            return resposta;
        }

        public async Task<EscalaDiaResponse> ObterDiaAsync(DateTime data)
        {
            var dia = data.Date;
            var escala = Expediente.EscalaDoDia(dia);

            var profissionais = await CarregarProfissionaisAtivosAsync();
            var ausencias = await _context.AusenciasProfissional.AsNoTracking()
                .Where(a => a.Data == dia)
                .ToListAsync();
            var nomesRegistro = await NomesDosUsuariosAsync(ausencias.Select(a => a.RegistradoPor));
            var consultas = await _context.Agendamentos.AsNoTracking()
                .Include(a => a.Paciente).ThenInclude(p => p.Pessoa)
                .Where(a => a.Status == StatusAgendamento.Agendado && a.DataHoraConsulta >= dia && a.DataHoraConsulta < dia.AddDays(1))
                .OrderBy(a => a.DataHoraConsulta)
                .ToListAsync();

            var resposta = new EscalaDiaResponse { Data = dia, Escala = (int)escala };

            foreach (var p in profissionais.Where(p => p.Escala == escala).OrderBy(p => p.Usuario.Role).ThenBy(p => p.Pessoa?.Nome))
            {
                var ausencia = ausencias.FirstOrDefault(a => a.ProfissionalId == p.Id);
                resposta.Profissionais.Add(new ProfissionalPlantao
                {
                    Id = p.Id,
                    Nome = p.Pessoa?.Nome ?? "-",
                    Tipo = p.Usuario.Role.ToString(),
                    Especialidades = p.Especialidades.Select(e => (int)e.EspecialidadeId).ToList(),
                    Consultas = consultas.Count(c => c.ProfissionalId == p.Id),
                    Ausencia = ausencia == null ? null : MapearAusencia(ausencia, nomesRegistro)
                });
            }

            if (dia >= Hoje)
            {
                var porId = profissionais.ToDictionary(p => p.Id);
                var ausentes = ausencias.Select(a => a.ProfissionalId).ToHashSet();
                foreach (var c in consultas)
                {
                    porId.TryGetValue(c.ProfissionalId, out var prof);
                    string? motivo = ausentes.Contains(c.ProfissionalId) ? MotivoAusencia
                        : prof != null && prof.Escala != escala ? MotivoForaDaEscala
                        : null;
                    if (motivo == null) continue;

                    resposta.ConsultasARemarcar.Add(new ConsultaARemarcar
                    {
                        Id = c.Id,
                        DataHoraConsulta = c.DataHoraConsulta,
                        TipoConsulta = c.TipoConsulta.ToString(),
                        Paciente = c.Paciente?.Pessoa?.Nome ?? "-",
                        ProfissionalId = c.ProfissionalId,
                        Profissional = prof?.Pessoa?.Nome ?? "-",
                        Motivo = motivo
                    });
                }
            }

            return resposta;
        }

        public async Task<RegistrarAusenciaResponse> RegistrarAusenciaAsync(RegistrarAusenciaRequest request, Guid registradoPor)
        {
            var dia = request.Data.Date;
            var motivo = request.Motivo?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(motivo))
                throw new ValidationException("Informe o motivo da ausência.");
            if (motivo.Length > AusenciaProfissional.TamanhoMaximoMotivo)
                throw new ValidationException($"O motivo deve ter no máximo {AusenciaProfissional.TamanhoMaximoMotivo} caracteres.");
            if (dia < Hoje)
                throw new BusinessRuleException("Não é possível registrar ausência em data passada.");

            var profissional = await _context.Profissionais
                .Include(p => p.Pessoa)
                .FirstOrDefaultAsync(p => p.Id == request.ProfissionalId)
                ?? throw new NotFoundException("Profissional não encontrado.");

            if (!profissional.EscaladoNoDia(dia))
                throw new BusinessRuleException($"{profissional.Pessoa?.Nome ?? "O profissional"} não está de plantão em {dia:dd/MM/yyyy}.");
            if (await _context.AusenciasProfissional.AnyAsync(a => a.ProfissionalId == profissional.Id && a.Data == dia))
                throw new BusinessRuleException("Já existe uma ausência registrada para este profissional neste dia.");

            var ausencia = new AusenciaProfissional(profissional.Id, dia, motivo, registradoPor);
            _context.AusenciasProfissional.Add(ausencia);
            await _context.SaveChangesAsync();

            // A ausência não cancela nada sozinha: as consultas do dia ficam listadas para remarcar.
            var aRemarcar = await _context.Agendamentos.CountAsync(a =>
                a.ProfissionalId == profissional.Id && a.Status == StatusAgendamento.Agendado &&
                a.DataHoraConsulta >= dia && a.DataHoraConsulta < dia.AddDays(1));

            var nomes = await NomesDosUsuariosAsync(new Guid?[] { registradoPor });
            return new RegistrarAusenciaResponse
            {
                Ausencia = MapearAusencia(ausencia, nomes),
                ConsultasARemarcar = aRemarcar
            };
        }

        public async Task RemoverAusenciaAsync(Guid id)
        {
            var ausencia = await _context.AusenciasProfissional.FirstOrDefaultAsync(a => a.Id == id)
                ?? throw new NotFoundException("Ausência não encontrada.");
            if (ausencia.Data < Hoje)
                throw new BusinessRuleException("Ausências de dias passados ficam no histórico e não podem ser removidas.");

            _context.AusenciasProfissional.Remove(ausencia);
            await _context.SaveChangesAsync();
        }

        // ----------------- Helpers -----------------

        // Médicos e enfermeiras ativos (o admin também tem um registro de profissional, mas não atende).
        private async Task<List<Profissional>> CarregarProfissionaisAtivosAsync() =>
            await _context.Profissionais.AsNoTracking()
                .Include(p => p.Usuario)
                .Include(p => p.Pessoa)
                .Include(p => p.Especialidades)
                .Where(p => p.Situacao == Situacao.Ativo &&
                            (p.Usuario.Role == RoleUsuario.Medico || p.Usuario.Role == RoleUsuario.Enfermeira))
                .ToListAsync();

        private async Task<Dictionary<Guid, string>> NomesDosUsuariosAsync(IEnumerable<Guid?> ids)
        {
            var lista = ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
            if (lista.Count == 0) return new();
            return await (from u in _context.Usuarios.AsNoTracking()
                          join p in _context.Pessoas.AsNoTracking() on u.PessoaId equals p.Id
                          where lista.Contains(u.Id)
                          select new { u.Id, p.Nome })
                .ToDictionaryAsync(x => x.Id, x => x.Nome);
        }

        private static AusenciaResponse MapearAusencia(AusenciaProfissional a, Dictionary<Guid, string> nomes) => new()
        {
            Id = a.Id,
            ProfissionalId = a.ProfissionalId,
            Data = a.Data,
            Motivo = a.Motivo,
            RegistradoPor = a.RegistradoPor.HasValue && nomes.TryGetValue(a.RegistradoPor.Value, out var nome) ? nome : null,
            DtCriado = a.DtCriado
        };
    }
}
