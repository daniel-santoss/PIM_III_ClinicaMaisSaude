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
        /// <summary>Obrigatório no wizard (DDD + número).</summary>
        public string? Telefone { get; set; }
        public bool TemProblemaMemoria { get; set; }
        /// <summary>Aceite dos termos de uso (consentimento LGPD) — obrigatório.</summary>
        public bool AceiteTermos { get; set; }
        /// <summary>Token de e-mail verificado (emitido no passo de confirmação) — amarra o e-mail.</summary>
        public string EmailVerificadoToken { get; set; } = string.Empty;
        public Guid ModeloId { get; set; }
        public List<RespostaDeclaracaoItem> Respostas { get; set; } = new();
    }

    public class RespostaDeclaracaoItem
    {
        public Guid PerguntaId { get; set; }
        public bool Resposta { get; set; }
        public string? Detalhe { get; set; }
    }

    /// <summary>Uma solicitação (em análise ou já decidida), com identidade, respostas da DS e decisões — para o admin.</summary>
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

        /// <summary>Nome do status (EmAnalise, Aprovada, Recusada).</summary>
        public string Status { get; set; } = string.Empty;
        public string? MotivoRecusa { get; set; }
        /// <summary>Última decisão (aprovação, recusa ou retificação): quando e por quem.</summary>
        public DateTime? DecididaEm { get; set; }
        public string? DecididaPor { get; set; }
        /// <summary>Se a decisão ainda pode ser retificada; quando não, MotivoNaoRetificavel diz por quê.</summary>
        public bool PodeRetificar { get; set; }
        public string? MotivoNaoRetificavel { get; set; }
        public List<HistoricoSolicitacaoItem> Historico { get; set; } = new();
    }

    /// <summary>Uma decisão da trilha de auditoria da solicitação.</summary>
    public class HistoricoSolicitacaoItem
    {
        public string StatusAnterior { get; set; } = string.Empty;
        public string StatusNovo { get; set; } = string.Empty;
        public string? Motivo { get; set; }
        /// <summary>Nome de quem decidiu; nulo nas decisões anteriores à trilha.</summary>
        public string? RealizadoPor { get; set; }
        public DateTime Dt { get; set; }
    }

    /// <summary>
    /// Página de solicitações de um status. Os totais por status (indicadores e abas da tela) não
    /// dependem da busca nem da página; TotalCount/TotalPages se referem ao resultado filtrado.
    /// </summary>
    public class SolicitacoesPaginadasResponse : PagedResult<SolicitacaoAdminResponse>
    {
        public int TotalEmAnalise { get; set; }
        public int TotalRequerApoio { get; set; }
        public int TotalAprovadas { get; set; }
        public int TotalRecusadas { get; set; }
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

    /// <summary>Corpo da retificação de uma decisão (o motivo fica na trilha e vai no e-mail ao proponente).</summary>
    public class RetificarSolicitacaoRequest
    {
        public string Motivo { get; set; } = string.Empty;
    }
}
