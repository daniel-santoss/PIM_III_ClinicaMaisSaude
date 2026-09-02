using System;
using System.Collections.Generic;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Uma solicitação de auto-cadastro moderado: o proponente (identidade em <see cref="Pessoa"/>)
    /// preencheu a Declaração de Saúde de um <see cref="ModeloDeclaracaoSaude"/> e aguarda a avaliação
    /// presencial + decisão da clínica. Guarda o status de análise e as respostas da DS.
    /// </summary>
    public class SolicitacaoCadastro : IAuditavel
    {
        public Guid Id { get; private set; }
        public Guid PessoaId { get; private set; }
        // Modelo respondido — fixado no momento da solicitação (integridade histórica das respostas).
        public Guid ModeloId { get; private set; }
        public StatusSolicitacao Status { get; private set; }
        /// <summary>Preenchido quando a solicitação é recusada (vai no e-mail ao proponente).</summary>
        public string? MotivoRecusa { get; private set; }
        /// <summary>Consentimento LGPD: quando o proponente aceitou os termos de uso, e qual versão.</summary>
        public DateTime? TermosAceitosEm { get; private set; }
        public string? TermosVersao { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;

        public virtual Pessoa? Pessoa { get; private set; }
        public virtual ModeloDeclaracaoSaude? Modelo { get; private set; }
        public virtual ICollection<RespostaDeclaracaoSaude> Respostas { get; private set; } = new List<RespostaDeclaracaoSaude>();

        protected SolicitacaoCadastro() { } // EF Core

        public SolicitacaoCadastro(Guid pessoaId, Guid modeloId)
        {
            Id = SequentialGuid.Next();
            PessoaId = pessoaId;
            ModeloId = modeloId;
            Status = StatusSolicitacao.EmAnalise;
            DtCriado = DateTime.UtcNow;
        }

        /// <summary>Registra o aceite dos termos de uso (consentimento LGPD) no momento da solicitação.</summary>
        public void RegistrarConsentimento(string versao)
        {
            if (string.IsNullOrWhiteSpace(versao))
                throw new ArgumentException("A versão dos termos é obrigatória.", nameof(versao));
            TermosAceitosEm = DateTime.UtcNow;
            TermosVersao = versao;
        }

        public bool EstaEmAnalise => Status == StatusSolicitacao.EmAnalise;

        /// <summary>Aprova a solicitação (a criação da conta/1º acesso é orquestrada no serviço).</summary>
        public void Aprovar()
        {
            if (Status != StatusSolicitacao.EmAnalise)
                throw new InvalidOperationException("Só é possível aprovar uma solicitação em análise.");
            Status = StatusSolicitacao.Aprovada;
            MotivoRecusa = null;
        }

        /// <summary>Recusa a solicitação com um motivo (enviado por e-mail ao proponente).</summary>
        public void Recusar(string motivo)
        {
            if (Status != StatusSolicitacao.EmAnalise)
                throw new InvalidOperationException("Só é possível recusar uma solicitação em análise.");
            if (string.IsNullOrWhiteSpace(motivo))
                throw new ArgumentException("O motivo da recusa é obrigatório.", nameof(motivo));
            Status = StatusSolicitacao.Recusada;
            MotivoRecusa = motivo.Trim();
        }
    }
}
