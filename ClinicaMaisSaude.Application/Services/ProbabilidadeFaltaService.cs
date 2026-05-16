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

            // Cancelamentos: +10% por ocorrência
            // Regra 1: Cancelado mais de 1 hora após a criação (ignorar erros imediatos da recepção)
            // Regra 2: Cancelado faltando menos de 4 dias para a consulta (penalidade por cancelar tarde)
            int qtdCancelamentos = historicoTodosAgendamentos.Count(h => 
                (h.TipoEvento == TipoEventoHistorico.Cancelamento || h.TipoEvento == TipoEventoHistorico.MudancaStatus) && 
                h.StatusNovo == StatusAgendamento.Cancelado &&
                (h.Dt_Criado - h.Agendamento.DtCriado).TotalHours > 1 &&
                (h.Agendamento.DataHoraConsulta - h.Dt_Criado).TotalDays < 4);
            probabilidade += qtdCancelamentos * 10;

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



            // Frequência perfeita nos últimos 3 agendamentos: -15% fixo
            // Só ganha o bônus se realmente compareceu nos 3 (Cancelamento não conta como positivo)
            var ultimos3Agendamentos = todosAgendamentosDoPaciente
                .Where(a => a.Status == StatusAgendamento.Finalizado || a.Status == StatusAgendamento.Faltou || a.Status == StatusAgendamento.Cancelado)
                .OrderByDescending(a => a.DataHoraConsulta)
                .Take(3)
                .ToList();

            if (ultimos3Agendamentos.Any() && ultimos3Agendamentos.All(a => a.Status == StatusAgendamento.Finalizado))
            {
                probabilidade -= 15;
            }

            // TemProblemaMemoria = false, sem faltas e com histórico de comparecimento: -10% fixo
            if (!paciente.TemProblemaMemoria && qtdFaltas == 0 && qtdComparecidas > 0)
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
