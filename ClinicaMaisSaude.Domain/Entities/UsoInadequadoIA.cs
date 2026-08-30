using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
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
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            TipoViolacao = tipoViolacao;
            TextoInserido = textoInserido;
            DtCriado = DateTime.UtcNow;
        }
    }
}
