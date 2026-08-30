using System;
using System.Collections.Generic;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Um modelo de Declaração de Saúde (DS): o conjunto de perguntas que o proponente responde.
    /// Podem existir vários modelos; exatamente um é o <see cref="ModeloPadrao"/> (o vigente hoje).
    /// "O modelo É a versão" — trocar a DS = criar um novo modelo (integridade histórica das respostas).
    /// Futuro: um modelo por unidade da clínica (UnidadeId).
    /// </summary>
    public class ModeloDeclaracaoSaude : IAuditavel
    {
        public Guid Id { get; private set; }
        public string Nome { get; private set; }
        /// <summary>Marca o modelo vigente/geral. Só um modelo deve ser padrão por vez (garantido na aplicação).</summary>
        public bool ModeloPadrao { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;

        public virtual ICollection<PerguntaDeclaracaoSaude> Perguntas { get; private set; } = new List<PerguntaDeclaracaoSaude>();

        protected ModeloDeclaracaoSaude() { } // EF Core

        public ModeloDeclaracaoSaude(string nome, bool modeloPadrao = false)
        {
            Id = SequentialGuid.Next();
            Nome = nome;
            ModeloPadrao = modeloPadrao;
            DtCriado = DateTime.UtcNow;
        }

        public void Renomear(string nome)
        {
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("O nome do modelo não pode ser vazio.", nameof(nome));
            Nome = nome;
        }

        /// <summary>Define/limpa a flag de modelo padrão (a exclusividade é coordenada na aplicação).</summary>
        public void DefinirComoPadrao(bool padrao) => ModeloPadrao = padrao;
    }
}
