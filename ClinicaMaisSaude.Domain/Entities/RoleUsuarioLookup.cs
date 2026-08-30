using System;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class RoleUsuarioLookup
    {
        public RoleUsuario Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DtCriado { get; set; }
    }
}
