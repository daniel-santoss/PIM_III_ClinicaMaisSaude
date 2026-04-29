using System;
using System.ComponentModel.DataAnnotations;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class RemarcarAgendamentoRequest
    {
        [Required(ErrorMessage = "A nova data e hora são obrigatórias.")]
        public DateTime NovaDataHora { get; set; }

        [Required(ErrorMessage = "A observação é obrigatória para remarcações.")]
        [MinLength(5, ErrorMessage = "A observação deve ter pelo menos 5 caracteres.")]
        public string Observacao { get; set; } = string.Empty;
    }
}
