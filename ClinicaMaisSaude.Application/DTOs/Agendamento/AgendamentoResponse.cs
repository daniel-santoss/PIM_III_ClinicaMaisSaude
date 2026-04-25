using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class AgendamentoResponse
    {
        public Guid Id { get; set; }
        public Guid PacienteId { get; set; }
        public string PacienteNome { get; set; } = string.Empty;
        public Guid MedicoId { get; set; }
        public DateTime DataHoraConsulta { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
