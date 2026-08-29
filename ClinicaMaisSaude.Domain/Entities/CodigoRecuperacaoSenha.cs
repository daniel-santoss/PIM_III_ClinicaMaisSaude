using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Código de uso único para autoatendimento de recuperação de senha (RF: "Esqueci minha senha").
    /// O código de 6 caracteres NÃO é guardado em texto: fica como HMAC-SHA256(código, pepper) —
    /// rápido e resistente a vazamento do banco (sem o pepper, fora do banco, não há como reverter
    /// um segredo curto). Após validar o código, emite-se um reset token de alta entropia (256 bits),
    /// guardado como SHA-256, que autoriza a troca de senha. Ver RecuperacaoSenhaService.
    /// </summary>
    public class CodigoRecuperacaoSenha
    {
        public Guid Id { get; private set; } = SequentialGuid.Next();

        public Guid UsuarioId { get; private set; }
        public Usuario Usuario { get; private set; } = null!;

        /// <summary>HMAC-SHA256(código, pepper) em hex. Nunca o código em claro.</summary>
        public string CodigoHash { get; private set; } = string.Empty;

        public DateTime DtCriado { get; private set; } = DateTime.UtcNow;
        public DateTime DtExpiracao { get; private set; }

        /// <summary>Consumido: o código já foi validado (uso único) ou invalidado por tentativas.</summary>
        public bool Usado { get; private set; }

        /// <summary>Tentativas erradas neste código (trava em 5).</summary>
        public int Tentativas { get; private set; }

        /// <summary>SHA-256(reset token) em hex — preenchido quando o código é validado com sucesso.</summary>
        public string? ResetTokenHash { get; private set; }
        public DateTime? DtExpiracaoReset { get; private set; }

        // Construtor exigido pelo EF Core (materialização).
        private CodigoRecuperacaoSenha() { }

        public CodigoRecuperacaoSenha(Guid usuarioId, string codigoHash, DateTime dtExpiracao)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            CodigoHash = codigoHash;
            DtCriado = DateTime.UtcNow;
            DtExpiracao = dtExpiracao;
            Usado = false;
            Tentativas = 0;
        }

        public bool Expirado() => DtExpiracao < DateTime.UtcNow;

        public void RegistrarTentativa() => Tentativas++;

        public void MarcarUsado() => Usado = true;

        /// <summary>Define o reset token (já hasheado) e sua validade após validar o código.</summary>
        public void DefinirResetToken(string resetTokenHash, DateTime expiraEm)
        {
            ResetTokenHash = resetTokenHash;
            DtExpiracaoReset = expiraEm;
        }

        public bool ResetTokenValido() =>
            !string.IsNullOrEmpty(ResetTokenHash) &&
            DtExpiracaoReset.HasValue &&
            DtExpiracaoReset.Value > DateTime.UtcNow;
    }
}
