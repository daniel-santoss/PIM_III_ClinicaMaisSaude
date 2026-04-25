using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class AgendamentoRequest
    {
        public Guid PacienteId { get; set; }
        public Guid MedicoId { get; set; }
        public DateTime DataHoraConsulta { get; set; }
    }
}
