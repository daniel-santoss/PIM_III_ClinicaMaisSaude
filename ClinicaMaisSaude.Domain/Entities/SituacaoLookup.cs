using System;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>Lookup unificado de <see cref="Situacao"/> (paciente e profissional).</summary>
    public class SituacaoLookup
    {
        public Situacao Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
