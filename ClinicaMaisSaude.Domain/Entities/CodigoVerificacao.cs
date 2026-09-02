using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Código de e-mail de uso único, UNIFICADO para os três fluxos que precisavam dele: recuperação
    /// de senha, primeiro acesso do auto-cadastro e verificação de e-mail no auto-cadastro. Em vez de
    /// uma tabela por fluxo, uma só tabela com um discriminador (<see cref="TipoVerificacao"/>) mais o
    /// alvo apropriado a cada tipo:
    /// <list type="bullet">
    ///   <item><see cref="TipoVerificacao.RecuperacaoSenha"/> — chaveado por <see cref="UsuarioId"/>.</item>
    ///   <item><see cref="TipoVerificacao.PrimeiroAcesso"/> — chaveado por <see cref="PessoaId"/> + <see cref="SolicitacaoId"/> (o proponente ainda não tem conta).</item>
    ///   <item><see cref="TipoVerificacao.VerificacaoEmail"/> — chaveado só pelo <see cref="Email"/> (ainda não há Pessoa/Usuario).</item>
    /// </list>
    /// Cripto idêntica nos três (ver <c>CodigoVerificacaoCripto</c>): o código de 6 chars NUNCA é
    /// guardado em claro — fica como HMAC-SHA256(código, pepper), resistente a vazamento do banco. Ao
    /// validar, emite-se um token de alta entropia (guardado como SHA-256) que autoriza o passo final.
    /// </summary>
    public class CodigoVerificacao
    {
        public Guid Id { get; private set; } = SequentialGuid.Next();

        public TipoVerificacao Tipo { get; private set; }

        /// <summary>Destino do código — sempre presente (é para onde todo código vai por e-mail).</summary>
        public string Email { get; private set; } = string.Empty;

        // Alvos por tipo (nuláveis; preenchidos só quando o tipo os tem).
        public Guid? UsuarioId { get; private set; }
        public Usuario? Usuario { get; private set; }
        public Guid? PessoaId { get; private set; }
        public Pessoa? Pessoa { get; private set; }
        public Guid? SolicitacaoId { get; private set; }
        public SolicitacaoCadastro? Solicitacao { get; private set; }

        /// <summary>HMAC-SHA256(código, pepper) em hex. Nunca o código em claro.</summary>
        public string CodigoHash { get; private set; } = string.Empty;

        public DateTime DtCriado { get; private set; } = DateTime.UtcNow;
        public DateTime DtExpiracao { get; private set; }

        /// <summary>Consumido: o código já foi validado (uso único) ou invalidado por tentativas.</summary>
        public bool Usado { get; private set; }

        /// <summary>Tentativas erradas neste código (trava em 5).</summary>
        public int Tentativas { get; private set; }

        /// <summary>SHA-256(token) em hex — preenchido quando o código é validado com sucesso.</summary>
        public string? ResetTokenHash { get; private set; }
        public DateTime? DtExpiracaoReset { get; private set; }

        private CodigoVerificacao() { } // EF Core

        private CodigoVerificacao(TipoVerificacao tipo, string email, string codigoHash, DateTime dtExpiracao)
        {
            Id = SequentialGuid.Next();
            Tipo = tipo;
            Email = email;
            CodigoHash = codigoHash;
            DtCriado = DateTime.UtcNow;
            DtExpiracao = dtExpiracao;
            Usado = false;
            Tentativas = 0;
        }

        /// <summary>Recuperação de senha: chaveado pelo usuário existente.</summary>
        public static CodigoVerificacao ParaRecuperacaoSenha(Guid usuarioId, string email, string codigoHash, DateTime dtExpiracao) =>
            new(TipoVerificacao.RecuperacaoSenha, email, codigoHash, dtExpiracao) { UsuarioId = usuarioId };

        /// <summary>Primeiro acesso: chaveado pela pessoa (proponente sem conta) + a solicitação aprovada.</summary>
        public static CodigoVerificacao ParaPrimeiroAcesso(Guid pessoaId, Guid solicitacaoId, string email, string codigoHash, DateTime dtExpiracao) =>
            new(TipoVerificacao.PrimeiroAcesso, email, codigoHash, dtExpiracao) { PessoaId = pessoaId, SolicitacaoId = solicitacaoId };

        /// <summary>Verificação de e-mail no auto-cadastro: chaveado só pelo e-mail (ainda sem identidade).</summary>
        public static CodigoVerificacao ParaVerificacaoEmail(string email, string codigoHash, DateTime dtExpiracao) =>
            new(TipoVerificacao.VerificacaoEmail, email, codigoHash, dtExpiracao);

        public bool Expirado() => DtExpiracao < DateTime.UtcNow;

        public void RegistrarTentativa() => Tentativas++;

        public void MarcarUsado() => Usado = true;

        /// <summary>Define o token (já hasheado) e sua validade após validar o código.</summary>
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
