using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Trilha de auditoria (só inserção) das decisões sobre uma <see cref="SolicitacaoCadastro"/>:
    /// cada aprovação, recusa ou retificação vira uma linha com o status anterior e o novo, o motivo,
    /// quem decidiu e quando. Mesmo padrão do <see cref="AgendamentoHistorico"/>.
    /// </summary>
    public class SolicitacaoCadastroHistorico
    {
        public Guid Id { get; private set; }
        public Guid SolicitacaoId { get; private set; }
        public StatusSolicitacao StatusAnterior { get; private set; }
        public StatusSolicitacao StatusNovo { get; private set; }
        /// <summary>Motivo da recusa ou da retificação; nulo numa aprovação comum.</summary>
        public string? Motivo { get; private set; }
        /// <summary>Usuário (admin) que decidiu; nulo nas decisões anteriores à criação desta trilha.</summary>
        public Guid? RealizadoPor { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual SolicitacaoCadastro? Solicitacao { get; private set; }

        protected SolicitacaoCadastroHistorico() { } // EF Core

        public SolicitacaoCadastroHistorico(Guid solicitacaoId, StatusSolicitacao statusAnterior,
            StatusSolicitacao statusNovo, string? motivo, Guid? realizadoPor)
        {
            Id = SequentialGuid.Next();
            SolicitacaoId = solicitacaoId;
            StatusAnterior = statusAnterior;
            StatusNovo = statusNovo;
            Motivo = motivo;
            RealizadoPor = realizadoPor;
            DtCriado = DateTime.UtcNow;
        }
    }
}
