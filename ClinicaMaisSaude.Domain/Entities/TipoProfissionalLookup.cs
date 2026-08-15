using System;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class TipoProfissionalLookup
    {
        public TipoProfissional Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
