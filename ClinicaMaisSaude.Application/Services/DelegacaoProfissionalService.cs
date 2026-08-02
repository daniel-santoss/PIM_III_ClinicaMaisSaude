using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Services
{
    public class DelegacaoProfissionalService : IDelegacaoProfissionalService
    {
        private readonly IProfissionalRepository _profissionalRepository;
        private readonly IAgendamentoRepository _agendamentoRepository;
        private readonly IConflitoHorarioService _conflitoService;

        public DelegacaoProfissionalService(
            IProfissionalRepository profissionalRepository,
            IAgendamentoRepository agendamentoRepository,
            IConflitoHorarioService conflitoService)
        {
            _profissionalRepository = profissionalRepository;
            _agendamentoRepository = agendamentoRepository;
            _conflitoService = conflitoService;
        }

        public async Task<Guid> DelegarAsync(TipoProfissional tipo, TipoConsulta consulta, DateTime escopoHorario, Guid? ignorarAgendamentoId, int? especialidadeId)
        {
            var profissionais = await _profissionalRepository.ObterTodosPorTipoAsync(tipo);
            if (!profissionais.Any())
                throw new BusinessRuleException("Nenhum profissional deste tipo cadastrado no sistema.");

            // Filtra por especialidade quando informada (apenas para médicos)
            if (especialidadeId.HasValue && tipo == TipoProfissional.Medico)
            {
                var comEspecialidade = profissionais
                    .Where(p => p.Especialidades.Any(e => (int)e.EspecialidadeId == especialidadeId.Value))
                    .ToList();

                if (comEspecialidade.Any())
                    profissionais = comEspecialidade;
                else
                    throw new BusinessRuleException("Nenhum médico com a especialidade solicitada encontrado.");
            }

            var candidatos = new List<(Guid ProfissionalId, int NoDia, int AtivosGeral)>();

            foreach (var prof in profissionais)
            {
                bool temConflito = await _conflitoService.ExisteConflitoProfissionalAsync(prof.Id, escopoHorario, consulta, ignorarAgendamentoId);

                if (!temConflito)
                {
                    // 1. Agendamentos do profissional no dia da consulta (excluindo os cancelados) — filtro no banco
                    var noDia = await _agendamentoRepository.ContarNaoCanceladosNoDiaAsync(prof.Id, escopoHorario);

                    // 2. Total de agendamentos ativos em geral, para desempate — filtro no banco
                    var ativosGeral = await _agendamentoRepository.ContarAtivosDoProfissionalAsync(prof.Id);

                    candidatos.Add((prof.Id, noDia, ativosGeral));
                }
            }

            if (!candidatos.Any())
                throw new BusinessRuleException("Nenhum profissional disponível neste horário. Tente outro horário.");

            // Seleciona o profissional com a menor contagem no dia, usando a carga ativa total como desempate
            return candidatos.OrderBy(c => c.NoDia).ThenBy(c => c.AtivosGeral).First().ProfissionalId;
        }
    }
}
