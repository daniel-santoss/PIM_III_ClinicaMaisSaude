using System;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Application.DTOs.AutoCadastro
{
    /// <summary>Resumo de um modelo de DS para a listagem do editor (admin).</summary>
    public class ModeloResumoResponse
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool ModeloPadrao { get; set; }
        public int QtdPerguntas { get; set; }
        /// <summary>Se já há solicitações usando o modelo — quando true, as perguntas ficam travadas (crie um novo).</summary>
        public bool PossuiSolicitacoes { get; set; }
        public DateTime DtCriado { get; set; }
    }

    /// <summary>Modelo + perguntas ordenadas, para editar.</summary>
    public class ModeloDetalheResponse
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool ModeloPadrao { get; set; }
        public bool PossuiSolicitacoes { get; set; }
        public List<PerguntaAdminResponse> Perguntas { get; set; } = new();
    }

    public class PerguntaAdminResponse
    {
        public Guid Id { get; set; }
        public string Pergunta { get; set; } = string.Empty;
        public int Ordem { get; set; }
    }

    public class CriarModeloRequest
    {
        public string Nome { get; set; } = string.Empty;
        public bool DefinirComoPadrao { get; set; }
    }

    public class RenomearModeloRequest
    {
        public string Nome { get; set; } = string.Empty;
    }

    /// <summary>Criação/edição de uma pergunta. Ordem opcional na criação (vai para o fim).</summary>
    public class PerguntaRequest
    {
        public string Pergunta { get; set; } = string.Empty;
        public int? Ordem { get; set; }
    }
}
