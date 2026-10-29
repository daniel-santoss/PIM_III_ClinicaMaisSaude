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
    /// (<see cref="Expediente.EscalaDoDia"/>); o que fica no banco é só o primeiro plantão (e a escala)
    /// de cada profissional e as ausências pontuais. "Consultas a remarcar" são as agendadas com um
    /// profissional que não está de plantão no dia: ausente, ou fora dos plantões dele (outra escala
    /// ou antes do primeiro plantão — troca de início ou dados antigos). Uma ausência só vale em dia de
    /// plantão: se a escala mudar e o dia deixar de ser plantão, ela fica guardada sem efeito.
    ///
    /// Pensado para crescer: o calendário do mês usa contagens agrupadas (não carrega os profissionais
    /// um a um), a lista do dia é paginada no banco e a busca do filtro devolve no máximo 10 nomes.
    /// </summary>
    public class EscalaService : IEscalaService
    {
        private const string MotivoAusencia = "Ausência";
        private const string MotivoForaDaEscala = "Fora da escala";
        private const int LimiteBusca = 10;
        private const int TamanhoPaginaMaximo = 50;

        private readonly ClinicaDbContext _context;

        public EscalaService(ClinicaDbContext context)
        {
            _context = context;
        }

        // Fuso de Brasília, como no cálculo dos horários da agenda.
        private static DateTime Hoje => DateTime.UtcNow.AddHours(-3).Date;

        // Mesma regra de Profissional.EscaladoNoDia, para dados já projetados (sem a entidade).
        private static bool Escalado(EscalaTrabalho escala, DateTime inicioPlantoes, DateTime dia) =>
            dia.Date >= inicioPlantoes && Expediente.EscalaDoDia(dia) == escala;

        public async Task<EscalaMesResponse> ObterMesAsync(int ano, int mes)
        {
            if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100)
                throw new ValidationException("Mês inválido.");

            var inicio = new DateTime(ano, mes, 1);
            var fim = inicio.AddMonths(1);

            // Contagem agrupada por escala, início e papel: poucas linhas, mesmo com centenas de profissionais.
            var grupos = await ProfissionaisQueAtendem()
                .GroupBy(p => new { p.Escala, p.InicioPlantoes, p.Usuario.Role })
                .Select(g => new GrupoProfissionais(g.Key.Escala, g.Key.InicioPlantoes, g.Key.Role, g.Count()))
                .ToListAsync();

            var dias = await ResumirDiasAsync(inicio, fim, grupos);
            // Os cartões de resumo mostram "hoje" mesmo quando o calendário está em outro mês.
            var hoje = dias.FirstOrDefault(d => d.Data == Hoje) ?? (await ResumirDiasAsync(Hoje, Hoje.AddDays(1), grupos)).Single();

            return new EscalaMesResponse
            {
                Ano = ano,
                Mes = mes,
                Dias = dias,
                Hoje = hoje,
                Composicao = Enum.GetValues<EscalaTrabalho>().Select(e => new ComposicaoEscala
                {
                    Escala = (int)e,
                    Medicos = grupos.Where(g => g.Escala == e && g.Role == RoleUsuario.Medico).Sum(g => g.Qtd),
                    Enfermeiras = grupos.Where(g => g.Escala == e && g.Role == RoleUsuario.Enfermeira).Sum(g => g.Qtd)
                }).ToList()
            };
        }

        private record GrupoProfissionais(EscalaTrabalho Escala, DateTime InicioPlantoes, RoleUsuario Role, int Qtd);

        // Resumo (plantão, ausências, consultas a remarcar) de cada dia do intervalo [inicio, fim).
        private async Task<List<EscalaDiaResumo>> ResumirDiasAsync(DateTime inicio, DateTime fim, List<GrupoProfissionais> grupos)
        {
            var ausencias = await _context.AusenciasProfissional.AsNoTracking()
                .Where(a => a.Data >= inicio && a.Data < fim)
                .Join(ProfissionaisQueAtendem(), a => a.ProfissionalId, p => p.Id,
                    (a, p) => new { a.ProfissionalId, a.Data, p.Escala, p.InicioPlantoes, p.Usuario.Role })
                .ToListAsync();
            var consultas = await _context.Agendamentos.AsNoTracking()
                .Where(a => a.Status == StatusAgendamento.Agendado && a.DataHoraConsulta >= inicio && a.DataHoraConsulta < fim)
                .Select(a => new { a.ProfissionalId, a.DataHoraConsulta, a.Profissional.Escala, a.Profissional.InicioPlantoes })
                .ToListAsync();

            // Só valem as ausências de quem estaria de plantão no dia.
            var ausenciasValidas = ausencias.Where(a => Escalado(a.Escala, a.InicioPlantoes, a.Data)).ToList();
            var ausentes = ausenciasValidas.Select(a => (a.ProfissionalId, a.Data)).ToHashSet();

            var dias = new List<EscalaDiaResumo>();
            for (var dia = inicio; dia < fim; dia = dia.AddDays(1))
            {
                var escala = Expediente.EscalaDoDia(dia);
                int EscaladosDoPapel(RoleUsuario role) =>
                    grupos.Where(g => g.Role == role && g.Escala == escala && g.InicioPlantoes <= dia).Sum(g => g.Qtd);
                var ausentesDoDia = ausenciasValidas.Where(a => a.Data == dia).ToList();

                // No passado, só a ausência deixa consulta pendente; "fora da escala" lá é dado antigo.
                var aRemarcar = consultas.Count(c => c.DataHoraConsulta.Date == dia &&
                    (ausentes.Contains((c.ProfissionalId, dia)) ||
                     (dia >= Hoje && !Escalado(c.Escala, c.InicioPlantoes, dia))));

                dias.Add(new EscalaDiaResumo
                {
                    Data = dia,
                    Escala = (int)escala,
                    Medicos = EscaladosDoPapel(RoleUsuario.Medico) - ausentesDoDia.Count(a => a.Role == RoleUsuario.Medico),
                    Enfermeiras = EscaladosDoPapel(RoleUsuario.Enfermeira) - ausentesDoDia.Count(a => a.Role == RoleUsuario.Enfermeira),
                    Ausencias = ausentesDoDia.Count,
                    ConsultasARemarcar = aRemarcar
                });
            }
            return dias;
        }

        public async Task<EscalaDiaResponse> ObterDiaAsync(DateTime data, string? busca, int pagina, int tamanhoPagina)
        {
            var dia = data.Date;
            var escala = Expediente.EscalaDoDia(dia);
            pagina = Math.Max(1, pagina);
            tamanhoPagina = Math.Clamp(tamanhoPagina, 1, TamanhoPaginaMaximo);

            var escalados = ProfissionaisQueAtendem().Where(p => p.Escala == escala && p.InicioPlantoes <= dia);

            // Ausências que valem no dia (de quem está na escala) — costumam ser poucas.
            var ausencias = await _context.AusenciasProfissional.AsNoTracking()
                .Where(a => a.Data == dia && escalados.Select(p => p.Id).Contains(a.ProfissionalId))
                .Select(a => new { Ausencia = a, Nome = a.Profissional!.Pessoa!.Nome, a.Profissional.Usuario.Role })
                .ToListAsync();
            var nomesRegistro = await NomesDosUsuariosAsync(ausencias.Select(a => a.Ausencia.RegistradoPor));
            var ausenciaPorProfissional = ausencias.ToDictionary(
                a => a.Ausencia.ProfissionalId,
                a => MapearAusencia(a.Ausencia, nomesRegistro, a.Nome, a.Role));

            var resposta = new EscalaDiaResponse
            {
                Data = dia,
                Escala = (int)escala,
                Medicos = await escalados.CountAsync(p => p.Usuario.Role == RoleUsuario.Medico)
                          - ausencias.Count(a => a.Role == RoleUsuario.Medico),
                Enfermeiras = await escalados.CountAsync(p => p.Usuario.Role == RoleUsuario.Enfermeira)
                              - ausencias.Count(a => a.Role == RoleUsuario.Enfermeira),
                Ausencias = ausenciaPorProfissional.Values.OrderBy(a => a.Profissional).ToList()
            };

            // Consultas a remarcar do dia.
            var consultas = await _context.Agendamentos.AsNoTracking()
                .Where(a => a.Status == StatusAgendamento.Agendado && a.DataHoraConsulta >= dia && a.DataHoraConsulta < dia.AddDays(1))
                .OrderBy(a => a.DataHoraConsulta)
                .Select(a => new
                {
                    a.Id, a.DataHoraConsulta, a.TipoConsulta, a.ProfissionalId,
                    Paciente = a.Paciente.Pessoa!.Nome,
                    Profissional = a.Profissional.Pessoa!.Nome,
                    a.Profissional.Escala, a.Profissional.InicioPlantoes
                })
                .ToListAsync();
            foreach (var c in consultas)
            {
                var foraDaEscala = !Escalado(c.Escala, c.InicioPlantoes, dia);
                string? motivo = foraDaEscala ? (dia >= Hoje ? MotivoForaDaEscala : null)
                    : ausenciaPorProfissional.ContainsKey(c.ProfissionalId) ? MotivoAusencia
                    : null;
                if (motivo == null) continue;

                resposta.ConsultasARemarcar.Add(new ConsultaARemarcar
                {
                    Id = c.Id,
                    DataHoraConsulta = c.DataHoraConsulta,
                    TipoConsulta = c.TipoConsulta.ToString(),
                    Paciente = c.Paciente ?? "-",
                    ProfissionalId = c.ProfissionalId,
                    Profissional = c.Profissional ?? "-",
                    Motivo = motivo
                });
            }

            // Profissionais da escala do dia: paginado e filtrado no banco.
            var filtrados = escalados;
            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                filtrados = filtrados.Where(p => p.Pessoa != null && p.Pessoa.Nome.Contains(termo));
            }
            var total = await filtrados.CountAsync();
            var itensDaPagina = await filtrados
                .OrderBy(p => p.Usuario.Role).ThenBy(p => p.Pessoa!.Nome)
                .Skip((pagina - 1) * tamanhoPagina).Take(tamanhoPagina)
                .Select(p => new { p.Id, Nome = p.Pessoa!.Nome, p.Usuario.Role })
                .ToListAsync();
            var ids = itensDaPagina.Select(p => p.Id).ToList();
            var consultasPorProfissional = consultas.Where(c => ids.Contains(c.ProfissionalId))
                .GroupBy(c => c.ProfissionalId).ToDictionary(g => g.Key, g => g.Count());

            resposta.Profissionais = new PaginaProfissionaisPlantao
            {
                Total = total,
                Pagina = pagina,
                TamanhoPagina = tamanhoPagina,
                Itens = itensDaPagina.Select(p => new ProfissionalPlantao
                {
                    Id = p.Id,
                    Nome = p.Nome ?? "-",
                    Tipo = p.Role.ToString(),
                    Consultas = consultasPorProfissional.GetValueOrDefault(p.Id),
                    Ausencia = ausenciaPorProfissional.GetValueOrDefault(p.Id)
                }).ToList()
            };

            return resposta;
        }

        public async Task<List<ProfissionalResumo>> BuscarProfissionaisAsync(string? busca)
        {
            var consulta = ProfissionaisQueAtendem();
            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                consulta = consulta.Where(p => p.Pessoa != null && p.Pessoa.Nome.Contains(termo));
            }

            var itens = await consulta
                .OrderBy(p => p.Pessoa!.Nome)
                .Take(LimiteBusca)
                .Select(p => new { p.Id, Nome = p.Pessoa!.Nome, p.Usuario.Role })
                .ToListAsync();
            return itens.Select(p => new ProfissionalResumo { Id = p.Id, Nome = p.Nome ?? "-", Tipo = p.Role.ToString() }).ToList();
        }

        public async Task<EscalaProfissionalResponse> ObterMesDoProfissionalAsync(Guid profissionalId, int ano, int mes)
        {
            if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100)
                throw new ValidationException("Mês inválido.");

            var profissional = await _context.Profissionais.AsNoTracking()
                .Include(p => p.Pessoa)
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.Id == profissionalId)
                ?? throw new NotFoundException("Profissional não encontrado.");

            var inicio = new DateTime(ano, mes, 1);
            var fim = inicio.AddMonths(1);
            var ausencias = await _context.AusenciasProfissional.AsNoTracking()
                .Where(a => a.ProfissionalId == profissionalId && a.Data >= inicio && a.Data < fim)
                .ToListAsync();
            var nomesRegistro = await NomesDosUsuariosAsync(ausencias.Select(a => a.RegistradoPor));
            var consultasPorDia = (await _context.Agendamentos.AsNoTracking()
                    .Where(a => a.ProfissionalId == profissionalId && a.Status == StatusAgendamento.Agendado &&
                                a.DataHoraConsulta >= inicio && a.DataHoraConsulta < fim)
                    .Select(a => a.DataHoraConsulta)
                    .ToListAsync())
                .GroupBy(d => d.Date).ToDictionary(g => g.Key, g => g.Count());

            var nome = profissional.Pessoa?.Nome ?? "-";
            var resposta = new EscalaProfissionalResponse
            {
                Id = profissional.Id,
                Nome = nome,
                Tipo = profissional.Usuario.Role.ToString(),
                Escala = (int)profissional.Escala,
                InicioPlantoes = profissional.InicioPlantoes
            };
            for (var dia = inicio; dia < fim; dia = dia.AddDays(1))
            {
                var plantao = profissional.EscaladoNoDia(dia);
                var ausencia = plantao ? ausencias.FirstOrDefault(a => a.Data == dia) : null;
                resposta.Dias.Add(new DiaDoProfissional
                {
                    Data = dia,
                    Plantao = plantao,
                    Consultas = consultasPorDia.GetValueOrDefault(dia),
                    Ausencia = ausencia == null ? null : MapearAusencia(ausencia, nomesRegistro, nome, profissional.Usuario.Role)
                });
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

            var profissional = await _context.Profissionais
                .Include(p => p.Pessoa)
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.Id == request.ProfissionalId)
                ?? throw new NotFoundException("Profissional não encontrado.");

            if (!profissional.EscaladoNoDia(dia))
                throw new BusinessRuleException($"{profissional.Pessoa?.Nome ?? "O profissional"} não está de plantão em {dia:dd/MM/yyyy}.");
            if (await _context.AusenciasProfissional.AnyAsync(a => a.ProfissionalId == profissional.Id && a.Data == dia))
                throw new BusinessRuleException("Já existe uma ausência registrada para este profissional neste dia.");

            // Pode ser um dia passado: quem esqueceu de lançar na hora corrige depois, e o calendário
            // passa a mostrar que o profissional não trabalhou naquele dia.
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
                Ausencia = MapearAusencia(ausencia, nomes, profissional.Pessoa?.Nome, profissional.Usuario.Role),
                ConsultasARemarcar = aRemarcar
            };
        }

        public async Task RemoverAusenciaAsync(Guid id)
        {
            var ausencia = await _context.AusenciasProfissional.FirstOrDefaultAsync(a => a.Id == id)
                ?? throw new NotFoundException("Ausência não encontrada.");
            _context.AusenciasProfissional.Remove(ausencia);
            await _context.SaveChangesAsync();
        }

        // ----------------- Helpers -----------------

        // Médicos e enfermeiras ativos (o admin também tem um registro de profissional, mas não atende).
        private IQueryable<Profissional> ProfissionaisQueAtendem() =>
            _context.Profissionais.AsNoTracking()
                .Where(p => p.Situacao == Situacao.Ativo &&
                            (p.Usuario.Role == RoleUsuario.Medico || p.Usuario.Role == RoleUsuario.Enfermeira));

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

        private static AusenciaResponse MapearAusencia(AusenciaProfissional a, Dictionary<Guid, string> nomes,
            string? profissional, RoleUsuario role) => new()
        {
            Id = a.Id,
            ProfissionalId = a.ProfissionalId,
            Profissional = profissional,
            TipoProfissional = role.ToString(),
            Data = a.Data,
            Motivo = a.Motivo,
            RegistradoPor = a.RegistradoPor.HasValue && nomes.TryGetValue(a.RegistradoPor.Value, out var nome) ? nome : null,
            DtCriado = a.DtCriado
        };
    }
}
