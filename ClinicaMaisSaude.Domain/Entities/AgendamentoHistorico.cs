using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class AgendamentoHistorico
    {
        public Guid Id { get; private set; }
        public Guid AgendamentoId { get; private set; }
        public TipoEventoHistorico TipoEvento { get; private set; }
        public StatusAgendamento? StatusAnterior { get; private set; }
        public StatusAgendamento? StatusNovo { get; private set; }
        public DateTime? DataAnterior { get; private set; }
        public DateTime? DataNova { get; private set; }
        public string? Observacao { get; private set; }
        public Guid RealizadoPor { get; private set; }
        public DateTime Dt_Criado { get; private set; }

        public virtual Agendamento Agendamento { get; private set; }

        protected AgendamentoHistorico() { } // Para o EF Core

        public AgendamentoHistorico(
            Guid agendamentoId,
            TipoEventoHistorico tipoEvento,
            Guid realizadoPor,
            StatusAgendamento? statusAnterior = null,
            StatusAgendamento? statusNovo = null,
            DateTime? dataAnterior = null,
            DateTime? dataNova = null,
            string? observacao = null)
        {
            Id = Guid.NewGuid();
            AgendamentoId = agendamentoId;
            TipoEvento = tipoEvento;
            StatusAnterior = statusAnterior;
            StatusNovo = statusNovo;
            DataAnterior = dataAnterior;
            DataNova = dataNova;
            Observacao = observacao;
            RealizadoPor = realizadoPor;
            Dt_Criado = DateTime.UtcNow;
        }
    }
}
