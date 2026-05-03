using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class RemarcarAgendamentoRequest
    {
        public DateTime NovaDataHora { get; set; }
        public string Observacao { get; set; } = string.Empty;
    }
}

