using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class AgendamentoResponse
    {
        public Guid Id { get; set; }
        public Guid PacienteId { get; set; }
        public string PacienteNome { get; set; } = string.Empty;
        public Guid ProfissionalId { get; set; }
        public DateTime DataHoraConsulta { get; set; }
        public string TipoProfissional { get; set; } = string.Empty;
        public string TipoConsulta { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? AgendamentoOrigemId { get; set; }
    }
}
