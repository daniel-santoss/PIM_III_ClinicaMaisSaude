using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Editor (admin) dos modelos de Declaração de Saúde e suas perguntas (Thread D — D5). "O modelo É
    /// a versão": um modelo que JÁ foi usado em solicitações fica travado para mudança estrutural
    /// (perguntas/exclusão) — para alterar a DS vigente, cria-se um novo modelo e define-se como padrão.
    /// </summary>
    public interface IModeloDeclaracaoService
    {
        Task<List<ModeloResumoResponse>> ListarModelosAsync();
        Task<ModeloDetalheResponse?> ObterModeloAsync(Guid id);
        Task<ModeloDetalheResponse> CriarModeloAsync(CriarModeloRequest request);
        Task RenomearModeloAsync(Guid id, string nome);
        Task DefinirModeloPadraoAsync(Guid id);
        Task ExcluirModeloAsync(Guid id);

        Task<PerguntaAdminResponse> AdicionarPerguntaAsync(Guid modeloId, PerguntaRequest request);
        Task EditarPerguntaAsync(Guid perguntaId, PerguntaRequest request);
        Task ExcluirPerguntaAsync(Guid perguntaId);
        /// <summary>Reordena as perguntas do modelo conforme a ordem dos ids informados.</summary>
        Task ReordenarPerguntasAsync(Guid modeloId, List<Guid> perguntaIdsNaOrdem);
    }
}
