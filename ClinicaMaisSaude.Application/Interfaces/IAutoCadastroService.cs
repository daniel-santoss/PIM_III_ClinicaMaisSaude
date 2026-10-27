using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D). Fluxo público/anônimo: o proponente busca a Declaração de
    /// Saúde vigente e envia o mini-cadastro + respostas; a solicitação entra "EmAnalise". Fluxo admin
    /// (D3): a clínica lista as solicitações em análise e as aprova/recusa após a avaliação presencial.
    /// </summary>
    public interface IAutoCadastroService
    {
        /// <summary>A Declaração de Saúde vigente (modelo padrão) com suas perguntas; null se não houver modelo.</summary>
        Task<ModeloDeclaracaoSaudeResponse?> ObterDeclaracaoVigenteAsync();

        /// <summary>Registra uma solicitação de auto-cadastro (proponente sem login, EmAnalise).</summary>
        Task<CadastroResult> SolicitarAsync(SolicitacaoCadastroRequest request);

        /// <summary>
        /// Solicitações de um status (admin), com identidade, respostas da DS e decisões, paginadas e
        /// filtradas por nome ou CPF. Em análise: mais antigas primeiro (fila); decididas: mais recentes.
        /// </summary>
        Task<SolicitacoesPaginadasResponse> ListarSolicitacoesAsync(StatusSolicitacao status, string? busca, int page, int pageSize);

        /// <summary>Aprova uma solicitação e convida o proponente ao 1º acesso por e-mail.</summary>
        Task<CadastroResult> AprovarAsync(Guid solicitacaoId, Guid? realizadoPor = null);

        /// <summary>Recusa uma solicitação (com motivo), encerra o perfil do proponente e avisa por e-mail.</summary>
        Task<CadastroResult> RecusarAsync(Guid solicitacaoId, string motivo, Guid? realizadoPor = null);

        /// <summary>
        /// Inverte uma decisão (Aprovada ↔ Recusada), com motivo, e avisa o proponente. Bloqueada se ele
        /// já criou a conta (aí é desativar o paciente) ou se enviou uma solicitação mais nova.
        /// </summary>
        Task<CadastroResult> RetificarAsync(Guid solicitacaoId, string motivo, Guid? realizadoPor = null);
    }
}
