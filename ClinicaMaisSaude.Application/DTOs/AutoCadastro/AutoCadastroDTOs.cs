using System;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Application.DTOs.AutoCadastro
{
    /// <summary>Modelo de Declaração de Saúde vigente (padrão) + suas perguntas, para renderizar o formulário.</summary>
    public class ModeloDeclaracaoSaudeResponse
    {
        public Guid ModeloId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public List<PerguntaDeclaracaoResponse> Perguntas { get; set; } = new();
    }

    public class PerguntaDeclaracaoResponse
    {
        public Guid PerguntaId { get; set; }
        public string Pergunta { get; set; } = string.Empty;
        public int Ordem { get; set; }
    }

    /// <summary>Mini-cadastro do proponente + respostas da Declaração de Saúde.</summary>
    public class SolicitacaoCadastroRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefone { get; set; }
        public bool TemProblemaMemoria { get; set; }
        public Guid ModeloId { get; set; }
        public List<RespostaDeclaracaoItem> Respostas { get; set; } = new();
    }

    public class RespostaDeclaracaoItem
    {
        public Guid PerguntaId { get; set; }
        public bool Resposta { get; set; }
        public string? Detalhe { get; set; }
    }

    /// <summary>Uma solicitação em análise, com identidade e respostas da DS — para a fila de aprovação do admin.</summary>
    public class SolicitacaoAdminResponse
    {
        public Guid SolicitacaoId { get; set; }
        public DateTime DtCriado { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefone { get; set; }
        /// <summary>Sinal de acessibilidade (proponente declarou dificuldade de memória).</summary>
        public bool TemProblemaMemoria { get; set; }
        public List<RespostaAdminItem> Respostas { get; set; } = new();
    }

    public class RespostaAdminItem
    {
        public string Pergunta { get; set; } = string.Empty;
        public int Ordem { get; set; }
        public bool Resposta { get; set; }
        public string? Detalhe { get; set; }
    }

    /// <summary>Corpo da recusa de uma solicitação (o motivo vai no e-mail ao proponente).</summary>
    public class RecusarSolicitacaoRequest
    {
        public string Motivo { get; set; } = string.Empty;
    }
}
