using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Agendamento
    {
        public Guid Id { get; private set; }
        public DateTime DataHoraConsulta { get; private set; }
        public double ProbabilidadeFalta { get; private set; }
        public Guid PacienteId { get; private set; }
        public Guid MedicoId { get; private set; }
        public StatusAgendamento Status { get; private set; }

        public Agendamento(Guid pacienteId, Guid medicoId, DateTime dataHoraConsulta)
        {
            Id = Guid.NewGuid();
            PacienteId = pacienteId;
            MedicoId = medicoId;
            DataHoraConsulta = dataHoraConsulta;
            Status = StatusAgendamento.Agendado;
            ProbabilidadeFalta = 0;
        }
        public void AlterarStatus(StatusAgendamento novoStatus)
        {
            Status = novoStatus;
        }
    }
}

