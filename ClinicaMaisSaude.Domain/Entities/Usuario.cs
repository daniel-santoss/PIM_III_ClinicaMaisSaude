using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Usuario
    {
        public Guid Id { get; private set; }
        public string Email { get; private set; }
        public string Cpf { get; private set; }
        public string SenhaHash { get; private set; }
        public DateTime DtCriado { get; private set; }

        public Usuario(string email, string cpf, string senhaHash)
        {
            Id = Guid.NewGuid();
            Email = email;
            Cpf = cpf;
            SenhaHash = senhaHash;
            DtCriado = DateTime.UtcNow;
        }
    }
}
