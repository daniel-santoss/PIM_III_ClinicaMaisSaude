using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D): fluxo público/anônimo. O proponente busca a Declaração de
    /// Saúde vigente e envia o mini-cadastro + respostas; a solicitação entra "EmAnalise" e é decidida
    /// pela clínica após a avaliação presencial.
    /// </summary>
    public interface IAutoCadastroService
    {
        /// <summary>A Declaração de Saúde vigente (modelo padrão) com suas perguntas; null se não houver modelo.</summary>
        Task<ModeloDeclaracaoSaudeResponse?> ObterDeclaracaoVigenteAsync();

        /// <summary>Registra uma solicitação de auto-cadastro (proponente sem login, EmAnalise).</summary>
        Task<CadastroResult> SolicitarAsync(SolicitacaoCadastroRequest request);
    }
}
