using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Agendamento
    {
        public Guid Id { get; private set; }
        public DateTime DataHoraConsulta { get; private set; }
        public Guid PacienteId { get; private set; }
        public Guid ProfissionalId { get; private set; }
        public TipoProfissional TipoProfissional { get; private set; }
        public TipoConsulta TipoConsulta { get; private set; }
        public StatusAgendamento Status { get; private set; }
        public Guid? AgendamentoOrigemId { get; private set; }
        public double ProbabilidadeFalta { get; private set; }
        public bool ResultadoDisponivel { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual Paciente Paciente { get; private set; }

        public Agendamento(Guid pacienteId, Guid profissionalId, DateTime dataHoraConsulta,
            TipoProfissional tipoProfissional, TipoConsulta tipoConsulta, Guid? agendamentoOrigemId = null)
        {
            Id = Guid.NewGuid();
            PacienteId = pacienteId;
            ProfissionalId = profissionalId;
            DataHoraConsulta = dataHoraConsulta;
            TipoProfissional = tipoProfissional;
            TipoConsulta = tipoConsulta;
            AgendamentoOrigemId = agendamentoOrigemId;
            Status = StatusAgendamento.Agendado;
            ProbabilidadeFalta = 0;
            ResultadoDisponivel = false;
            DtCriado = DateTime.UtcNow;
        }

        public void AlterarStatus(StatusAgendamento novoStatus)
        {
            Status = novoStatus;
        }

        public void AlterarDataHora(DateTime novaDataHora)
        {
            DataHoraConsulta = novaDataHora;
        }

        public void MarcarResultadoDisponivel()
        {
            ResultadoDisponivel = true;
        }
    }
}
