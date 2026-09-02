using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Uma pergunta de um <see cref="ModeloDeclaracaoSaude"/>. Respondida como Sim/Não; se "Sim",
    /// o proponente detalha (obrigatório) na <see cref="RespostaDeclaracaoSaude"/>.
    /// </summary>
    public class PerguntaDeclaracaoSaude : IAuditavel
    {
        public Guid Id { get; private set; }
        public Guid ModeloId { get; private set; }
        public string Pergunta { get; private set; }
        public int Ordem { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;

        public virtual ModeloDeclaracaoSaude? Modelo { get; private set; }

        protected PerguntaDeclaracaoSaude() { } // EF Core

        public PerguntaDeclaracaoSaude(Guid modeloId, string pergunta, int ordem)
        {
            Id = SequentialGuid.Next();
            ModeloId = modeloId;
            Pergunta = pergunta;
            Ordem = ordem;
            DtCriado = DateTime.UtcNow;
        }

        public void Editar(string pergunta, int ordem)
        {
            if (string.IsNullOrWhiteSpace(pergunta))
                throw new ArgumentException("O texto da pergunta não pode ser vazio.", nameof(pergunta));
            Pergunta = pergunta;
            Ordem = ordem;
        }
    }
}
