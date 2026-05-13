using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Services
{
    public class ProbabilidadeFaltaService : IProbabilidadeFaltaService
    {
        private readonly IAgendamentoRepository _agendamentoRepository;
        private readonly IPacienteRepository _pacienteRepository;

        public ProbabilidadeFaltaService(IAgendamentoRepository agendamentoRepository, IPacienteRepository pacienteRepository)
        {
            _agendamentoRepository = agendamentoRepository;
            _pacienteRepository = pacienteRepository;
        }

        public async Task<(double Probabilidade, string Nivel)> CalcularProbabilidadeAsync(Guid pacienteId, DateTime dataAgendamento)
        {
            var paciente = await _pacienteRepository.ObterPorIdAsync(pacienteId);
            if (paciente == null)
            {
                return (0, "Baixa");
            }

            double probabilidade = 0;

            var historicoTodosAgendamentos = await _agendamentoRepository.ObterHistoricoPorPacienteIdAsync(pacienteId);
            var todosAgendamentosDoPaciente = await _agendamentoRepository.ObterTodosPorPacienteIdAsync(pacienteId);

            // Fatores de acréscimo
            
            // Faltas: +15% por ocorrência
            int qtdFaltas = historicoTodosAgendamentos.Count(h => h.TipoEvento == TipoEventoHistorico.MudancaStatus && h.StatusNovo == StatusAgendamento.Faltou);
            probabilidade += qtdFaltas * 15;

            // Cancelamentos < 24h: +10% por ocorrência
            // Verifica o histórico de cancelamentos onde a Dt_Criado (data do cancelamento) é < 24h da DataHoraConsulta
            int qtdCancelamentosEmCimaDaHora = historicoTodosAgendamentos.Count(h => 
                (h.TipoEvento == TipoEventoHistorico.Cancelamento || h.TipoEvento == TipoEventoHistorico.MudancaStatus) && 
                h.StatusNovo == StatusAgendamento.Cancelado && 
                (h.Agendamento.DataHoraConsulta - h.Dt_Criado).TotalHours < 24);
            probabilidade += qtdCancelamentosEmCimaDaHora * 10;

            // Remarcações: +5% por ocorrência
            int qtdRemarcacoes = historicoTodosAgendamentos.Count(h => h.TipoEvento == TipoEventoHistorico.Remarcacao);
            probabilidade += qtdRemarcacoes * 5;

            // Agendamento > 30 dias de antecedência: +10% fixo
            // Para ser exato com o "Agendamento da vez", precisamos saber quando foi criado.
            // Como este método pode calcular a probabilidade antes de o Agendamento ser criado no banco
            // vamos usar a data atual como DtCriado base caso não achemos o agendamento exato.
            var agendamentoAtual = todosAgendamentosDoPaciente.FirstOrDefault(a => a.DataHoraConsulta == dataAgendamento);
            DateTime dataCriacao = agendamentoAtual != null ? agendamentoAtual.DtCriado : DateTime.UtcNow;

            if ((dataAgendamento - dataCriacao).TotalDays > 30)
            {
                probabilidade += 10;
            }

            // TemProblemaMemoria = true: +20% fixo
            if (paciente.TemProblemaMemoria)
            {
                probabilidade += 20;
            }

            // Fatores de redução

            // Consultas comparecidas (Finalizado): -10% por ocorrência
            int qtdComparecidas = historicoTodosAgendamentos.Count(h => h.TipoEvento == TipoEventoHistorico.MudancaStatus && h.StatusNovo == StatusAgendamento.Finalizado);
            probabilidade -= qtdComparecidas * 10;

            // Agendamento com < 7 dias de antecedência: -10% fixo
            if ((dataAgendamento - dataCriacao).TotalDays < 7)
            {
                probabilidade -= 10;
            }

            // Nunca faltou nos últimos 3 agendamentos: -15% fixo
            // Identifica os últimos 3 agendamentos concluídos (Finalizado, Faltou ou Cancelado)
            var ultimos3Agendamentos = todosAgendamentosDoPaciente
                .Where(a => a.Status == StatusAgendamento.Finalizado || a.Status == StatusAgendamento.Faltou || a.Status == StatusAgendamento.Cancelado)
                .OrderByDescending(a => a.DataHoraConsulta)
                .Take(3)
                .ToList();

            if (ultimos3Agendamentos.Any() && !ultimos3Agendamentos.Any(a => a.Status == StatusAgendamento.Faltou))
            {
                probabilidade -= 15;
            }

            // TemProblemaMemoria = false e sem faltas na base: -10% fixo
            if (!paciente.TemProblemaMemoria && qtdFaltas == 0 && todosAgendamentosDoPaciente.Any())
            {
                probabilidade -= 10;
            }

            // Limites
            if (probabilidade < 0) probabilidade = 0;
            if (probabilidade > 100) probabilidade = 100;

            // Classificação
            string nivel = "Baixa";
            if (probabilidade > 30 && probabilidade <= 60) nivel = "Média";
            else if (probabilidade > 60) nivel = "Alta";

            return (probabilidade, nivel);
        }
    }
}
