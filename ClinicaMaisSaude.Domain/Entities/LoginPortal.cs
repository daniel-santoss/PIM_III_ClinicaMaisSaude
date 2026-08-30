using System;
using System.ComponentModel.DataAnnotations.Schema;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Usuario : IAuditavel
    {
        public Guid Id { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;
        public string Nome { get; private set; }
        public string Email { get; private set; }
        public string Cpf { get; private set; }
        public string? Telefone { get; private set; }
        public string SenhaHash { get; private set; }
        public TipoUsuario TipoUsuario { get; private set; }
        // Papel unificado (Fase A). Nulável durante a transição — populado por backfill a
        // partir de TipoUsuario + Profissional.TipoProfissional. Leituras migram na Fase A2.
        public RoleUsuario? Role { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltimoAcesso { get; private set; }
        
        public int TentativasLogin { get; private set; }
        public DateTime? BloqueadoAte { get; private set; }

        // Penalidade temporária de uso da IA (triagem). Fica na conta (LoginPortal) porque
        // as violações em UsoInadequadoIA já são por UsuarioId. Auto-expira pela data.
        public DateTime? BloqueadoIAAte { get; private set; }

        // Foto de perfil movida para uma tabela separada (1:1). Só é carregada quando a
        // query faz .Include(u => u.Foto); do contrário, esta navegação fica nula.
        public UsuarioFoto? Foto { get; private set; }

        // Conveniência de leitura: mantém o contrato antigo (usuario.FotoBase64) para o
        // código que já materializou a entidade. Não é mapeada para coluna (a fonte é a
        // tabela UsuarioFotos via a navegação Foto). Retorna null se a foto não foi carregada.
        [NotMapped]
        public string? FotoBase64 => Foto?.FotoBase64;

        public virtual ICollection<UsoInadequadoIA> Violacoes { get; private set; } = new List<UsoInadequadoIA>();

        public Usuario(string email, string cpf, string senhaHash, string nome, string? telefone = null, TipoUsuario tipoUsuario = TipoUsuario.Paciente)
        {
            Id = SequentialGuid.Next();
            Nome = nome;
            Email = email;
            Cpf = cpf;
            Telefone = telefone;
            SenhaHash = senhaHash;
            TipoUsuario = tipoUsuario;
            DtCriado = DateTime.UtcNow;
            TentativasLogin = 0;
            BloqueadoAte = null;
        }

        public Usuario(Guid id, string email, string cpf, string senhaHash, string nome, string? telefone, TipoUsuario tipoUsuario, DateTime dtCriado)
        {
            Id = id;
            Nome = nome;
            Email = email;
            Cpf = cpf;
            Telefone = telefone;
            SenhaHash = senhaHash;
            TipoUsuario = tipoUsuario;
            DtCriado = dtCriado;
            TentativasLogin = 0;
            BloqueadoAte = null;
        }

        public void AlterarSenha(string novoHash)
        {
            SenhaHash = novoHash;
        }

        /// <summary>Define o papel unificado (RoleUsuario) — usado no backfill e no cadastro (Fase A).</summary>
        public void DefinirRole(RoleUsuario role) => Role = role;

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

        public void AtualizarNome(string nome)
        {
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("O nome não pode ser vazio.", nameof(nome));
            Nome = nome;
        }

        public void AtualizarTelefone(string? telefone)
        {
            Telefone = telefone;
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

        public void BloquearIA(DateTime ate)
        {
            BloqueadoIAAte = ate;
        }

        public bool IsIABloqueada()
        {
            return BloqueadoIAAte.HasValue && BloqueadoIAAte.Value > DateTime.UtcNow;
        }

        /// <summary>Admin remove a penalidade de IA — libera a triagem.</summary>
        public void DesbloquearIA()
        {
            BloqueadoIAAte = null;
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
