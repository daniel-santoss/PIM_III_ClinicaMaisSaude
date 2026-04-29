using System;

namespace ClinicaMaisSaude.Application.DTOs.AgendamentoHistorico
{
    public class AgendamentoHistoricoResponse
    {
        public Guid Id { get; set; }
        public Guid AgendamentoId { get; set; }
        public string TipoEvento { get; set; } = string.Empty;
        public string? StatusAnterior { get; set; }
        public string? StatusNovo { get; set; }
        public DateTime? DataAnterior { get; set; }
        public DateTime? DataNova { get; set; }
        public string? Observacao { get; set; }
        public Guid RealizadoPor { get; set; }
        public string NomeRealizadoPor { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
