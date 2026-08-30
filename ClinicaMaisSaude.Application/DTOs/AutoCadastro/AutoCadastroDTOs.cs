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
}
