using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class RefreshToken
    {
        public Guid Id { get; set; } = SequentialGuid.Next();
        public string Token { get; set; } = string.Empty;
        public string JwtId { get; set; } = string.Empty; // ID do JWT associado
        public bool Usado { get; set; }
        public bool Revogado { get; set; }
        public DateTime DtCriado { get; set; } = DateTime.UtcNow;
        public DateTime DtExpiracao { get; set; }

        public Guid UsuarioId { get; set; }
        public Usuario Usuario { get; set; } = null!;
    }
}
