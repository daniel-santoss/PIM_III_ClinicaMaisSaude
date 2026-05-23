using System;

namespace ClinicaMaisSaude.Application.DTOs
{
    public class NotificacaoResponse
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;
        public Guid? AgendamentoId { get; set; }
        public string? Link { get; set; }
        public bool Lida { get; set; }
        public DateTime DtCriado { get; set; }
    }
}
