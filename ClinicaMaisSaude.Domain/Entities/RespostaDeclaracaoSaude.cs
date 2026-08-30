using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// A resposta do proponente a uma <see cref="PerguntaDeclaracaoSaude"/>, dentro de uma
    /// <see cref="SolicitacaoCadastro"/>. Sim/Não; quando "Sim", o <see cref="Detalhe"/> é obrigatório.
    /// </summary>
    public class RespostaDeclaracaoSaude
    {
        public Guid Id { get; private set; }
        public Guid SolicitacaoId { get; private set; }
        public Guid PerguntaId { get; private set; }
        public bool Resposta { get; private set; }
        /// <summary>Obrigatório quando <see cref="Resposta"/> é "Sim" (validado na criação).</summary>
        public string? Detalhe { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual SolicitacaoCadastro? Solicitacao { get; private set; }
        public virtual PerguntaDeclaracaoSaude? Pergunta { get; private set; }

        protected RespostaDeclaracaoSaude() { } // EF Core

        public RespostaDeclaracaoSaude(Guid solicitacaoId, Guid perguntaId, bool resposta, string? detalhe = null)
        {
            if (resposta && string.IsNullOrWhiteSpace(detalhe))
                throw new ArgumentException("Respostas 'Sim' exigem um detalhe.", nameof(detalhe));

            Id = SequentialGuid.Next();
            SolicitacaoId = solicitacaoId;
            PerguntaId = perguntaId;
            Resposta = resposta;
            Detalhe = resposta ? detalhe!.Trim() : null;
            DtCriado = DateTime.UtcNow;
        }
    }
}
