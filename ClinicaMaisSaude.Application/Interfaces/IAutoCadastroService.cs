using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;

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

        /// <summary>Fila de aprovação (admin): solicitações em análise, com identidade e respostas da DS.</summary>
        Task<List<SolicitacaoAdminResponse>> ListarSolicitacoesEmAnaliseAsync();

        /// <summary>Aprova uma solicitação e convida o proponente ao 1º acesso por e-mail.</summary>
        Task<CadastroResult> AprovarAsync(Guid solicitacaoId);

        /// <summary>Recusa uma solicitação (com motivo), encerra o perfil do proponente e avisa por e-mail.</summary>
        Task<CadastroResult> RecusarAsync(Guid solicitacaoId, string motivo);
    }
}
