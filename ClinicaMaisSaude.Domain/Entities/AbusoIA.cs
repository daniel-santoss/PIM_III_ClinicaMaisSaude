using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public enum TipoAbuso
    {
        Injecao = 1,
        UsoIndevido = 2
    }

    public class AbusoIA
    {
        public Guid Id { get; private set; }
        public Guid PacienteId { get; private set; }
        public TipoAbuso TipoAbuso { get; private set; }
        public string TextoInserido { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual Paciente Paciente { get; private set; }

        protected AbusoIA() { } // EF Core

        public AbusoIA(Guid pacienteId, TipoAbuso tipoAbuso, string textoInserido)
        {
            Id = Guid.NewGuid();
            PacienteId = pacienteId;
            TipoAbuso = tipoAbuso;
            TextoInserido = textoInserido;
            DtCriado = DateTime.UtcNow;
        }
    }
}
