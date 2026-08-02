using System;
using System.ComponentModel.DataAnnotations.Schema;
using ClinicaMaisSaude.Domain.Common;

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

        // Foto de perfil movida para uma tabela separada (1:1). Só é carregada quando a
        // query faz .Include(u => u.Foto); do contrário, esta navegação fica nula.
        public UsuarioFoto? Foto { get; private set; }

        // Conveniência de leitura: mantém o contrato antigo (usuario.FotoBase64) para o
        // código que já materializou a entidade. Não é mapeada para coluna (a fonte é a
        // tabela UsuarioFotos via a navegação Foto). Retorna null se a foto não foi carregada.
        [NotMapped]
        public string? FotoBase64 => Foto?.FotoBase64;

        public virtual ICollection<UsoInadequadoIA> Violacoes { get; private set; } = new List<UsoInadequadoIA>();

        public Usuario(string email, string cpf, string senhaHash, bool isAdmin = false)
        {
            Id = SequentialGuid.Next();
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

        public void AtualizarFoto(string? base64)
        {
            if (string.IsNullOrEmpty(base64))
            {
                // Remover a foto: descarta a linha em UsuarioFotos (orfã → deletada no SaveChanges).
                Foto = null;
                return;
            }

            if (Foto == null)
                Foto = new UsuarioFoto(Id, base64);
            else
                Foto.Atualizar(base64);
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

        public void BloquearPermanentemente()
        {
            BloqueadoAte = DateTime.UtcNow.AddYears(100);
        }

        /// <summary>Chamado pelo admin ao remover penalidade — libera o acesso ao login</summary>
        public void DesbloquearConta()
        {
            BloqueadoAte = null;
            TentativasLogin = 0;
        }
    }
}
