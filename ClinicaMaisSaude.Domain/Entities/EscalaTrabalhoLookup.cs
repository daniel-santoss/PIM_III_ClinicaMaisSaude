using System;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>Lookup de <see cref="EscalaTrabalho"/> (integridade do enum no banco).</summary>
    public class EscalaTrabalhoLookup
    {
        public EscalaTrabalho Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
