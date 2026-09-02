using System;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>Lookup de <see cref="TipoVerificacao"/> (integridade do enum discriminador no banco).</summary>
    public class TipoVerificacaoLookup
    {
        public TipoVerificacao Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
