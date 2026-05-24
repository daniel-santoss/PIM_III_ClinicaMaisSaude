using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public enum TipoViolacao
    {
        Injecao = 1,
        UsoIndevido = 2
    }

    public class UsoInadequadoIA
    {
        public Guid Id { get; private set; }
        public Guid UsuarioId { get; private set; }
        public TipoViolacao TipoViolacao { get; private set; }
        public string TextoInserido { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual Usuario Usuario { get; private set; }

        protected UsoInadequadoIA() { } // EF Core

        public UsoInadequadoIA(Guid usuarioId, TipoViolacao tipoViolacao, string textoInserido)
        {
            Id = Guid.NewGuid();
            UsuarioId = usuarioId;
            TipoViolacao = tipoViolacao;
            TextoInserido = textoInserido;
            DtCriado = DateTime.UtcNow;
        }
    }
}
