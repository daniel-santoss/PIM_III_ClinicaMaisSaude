using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Código de uso único do PRIMEIRO ACESSO do auto-cadastro moderado: o proponente aprovado
    /// (Pessoa sem conta + <see cref="SolicitacaoCadastro"/> aprovada) pede um código por e-mail,
    /// confirma com o CPF e define a senha — aí a conta é criada. Gêmea de
    /// <see cref="CodigoRecuperacaoSenha"/>, mas chaveada pela <see cref="Pessoa"/> (o proponente
    /// ainda não tem <c>Usuario</c>). Mesma cripto (HMAC-SHA256+pepper no código; reset token
    /// SHA-256); a diferença é o desfecho (cria conta em vez de trocar senha). Ver PrimeiroAcessoService.
    /// </summary>
    public class CodigoPrimeiroAcesso
    {
        public Guid Id { get; private set; } = SequentialGuid.Next();

        // Identidade do proponente (Thread B): a Pessoa é a chave — ainda não há Usuario.
        public Guid PessoaId { get; private set; }
        public Pessoa Pessoa { get; private set; } = null!;

        // Solicitação aprovada que autoriza este 1º acesso (integridade do vínculo).
        public Guid SolicitacaoId { get; private set; }
        public SolicitacaoCadastro Solicitacao { get; private set; } = null!;

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
        private CodigoPrimeiroAcesso() { }

        public CodigoPrimeiroAcesso(Guid pessoaId, Guid solicitacaoId, string codigoHash, DateTime dtExpiracao)
        {
            Id = SequentialGuid.Next();
            PessoaId = pessoaId;
            SolicitacaoId = solicitacaoId;
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
