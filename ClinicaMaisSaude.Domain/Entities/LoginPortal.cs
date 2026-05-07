using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Usuario
    {
        public Guid Id { get; private set; }
        public string Email { get; private set; }
        public string Cpf { get; private set; }
        public string SenhaHash { get; private set; }
        public bool IsAdmin { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltimoAcesso { get; private set; }
        
        public int TentativasLogin { get; private set; }
        public DateTime? BloqueadoAte { get; private set; }

        public Usuario(string email, string cpf, string senhaHash, bool isAdmin = false)
        {
            Id = Guid.NewGuid();
            Email = email;
            Cpf = cpf;
            SenhaHash = senhaHash;
            IsAdmin = isAdmin;
            DtCriado = DateTime.UtcNow;
            TentativasLogin = 0;
            BloqueadoAte = null;
        }

        public Usuario(Guid id, string email, string cpf, string senhaHash, bool isAdmin, DateTime dtCriado)
        {
            Id = id;
            Email = email;
            Cpf = cpf;
            SenhaHash = senhaHash;
            IsAdmin = isAdmin;
            DtCriado = dtCriado;
            TentativasLogin = 0;
            BloqueadoAte = null;
        }

        public void AlterarSenha(string novoHash)
        {
            SenhaHash = novoHash;
        }

        public void AtualizarUltimoAcesso()
        {
            UltimoAcesso = DateTime.UtcNow;
        }

        public void AtualizarEmail(string novoEmail)
        {
            Email = novoEmail;
        }

        public void RegistrarFalhaLogin()
        {
            TentativasLogin++;
            if (TentativasLogin >= 5)
            {
                BloqueadoAte = DateTime.UtcNow.AddMinutes(15);
            }
        }

        public void RegistrarSucessoLogin()
        {
            TentativasLogin = 0;
            BloqueadoAte = null;
        }

        public bool IsBloqueado()
        {
            return BloqueadoAte.HasValue && BloqueadoAte.Value > DateTime.UtcNow;
        }
    }
}
