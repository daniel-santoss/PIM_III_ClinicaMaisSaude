using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class AgendamentoRequest
    {
        public Guid PacienteId { get; set; }
        public DateTime DataHoraConsulta { get; set; }
        public int TipoProfissional { get; set; }
        public int TipoConsulta { get; set; }
        public Guid? AgendamentoOrigemId { get; set; }
    }
}
