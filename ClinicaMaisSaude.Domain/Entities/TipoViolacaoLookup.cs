using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class TipoViolacaoLookup
    {
        public TipoViolacao Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
