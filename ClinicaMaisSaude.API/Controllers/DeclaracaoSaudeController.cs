using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Editor (admin) dos modelos de Declaração de Saúde e suas perguntas (Thread D — D5). Só admin.
    /// A leitura pública do modelo vigente (para o formulário) fica no AutoCadastroController.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeclaracaoSaudeController : ControllerBase
    {
        private readonly IModeloDeclaracaoService _service;

        public DeclaracaoSaudeController(IModeloDeclaracaoService service)
        {
            _service = service;
        }

        [HttpGet("modelos")]
        public async Task<IActionResult> ListarModelos()
        {
            ExigirAdmin();
            return Ok(await _service.ListarModelosAsync());
        }

        [HttpGet("modelos/{id}")]
        public async Task<IActionResult> ObterModelo(Guid id)
        {
            ExigirAdmin();
            var modelo = await _service.ObterModeloAsync(id);
            if (modelo == null) throw new NotFoundException("Modelo não encontrado.");
            return Ok(modelo);
        }

        [HttpPost("modelos")]
        public async Task<IActionResult> CriarModelo([FromBody] CriarModeloRequest request)
        {
            ExigirAdmin();
            var criado = await _service.CriarModeloAsync(request);
            return Created("", criado);
        }

        [HttpPut("modelos/{id}")]
        public async Task<IActionResult> RenomearModelo(Guid id, [FromBody] RenomearModeloRequest request)
        {
            ExigirAdmin();
            await _service.RenomearModeloAsync(id, request?.Nome ?? string.Empty);
            return NoContent();
        }

        [HttpPost("modelos/{id}/definir-padrao")]
        public async Task<IActionResult> DefinirPadrao(Guid id)
        {
            ExigirAdmin();
            await _service.DefinirModeloPadraoAsync(id);
            return Ok(new { Mensagem = "Modelo definido como vigente." });
        }

        [HttpDelete("modelos/{id}")]
        public async Task<IActionResult> ExcluirModelo(Guid id)
        {
            ExigirAdmin();
            await _service.ExcluirModeloAsync(id);
            return NoContent();
        }

        [HttpPost("modelos/{id}/perguntas")]
        public async Task<IActionResult> AdicionarPergunta(Guid id, [FromBody] PerguntaRequest request)
        {
            ExigirAdmin();
            var criada = await _service.AdicionarPerguntaAsync(id, request);
            return Created("", criada);
        }

        [HttpPut("perguntas/{perguntaId}")]
        public async Task<IActionResult> EditarPergunta(Guid perguntaId, [FromBody] PerguntaRequest request)
        {
            ExigirAdmin();
            await _service.EditarPerguntaAsync(perguntaId, request);
            return NoContent();
        }

        [HttpDelete("perguntas/{perguntaId}")]
        public async Task<IActionResult> ExcluirPergunta(Guid perguntaId)
        {
            ExigirAdmin();
            await _service.ExcluirPerguntaAsync(perguntaId);
            return NoContent();
        }

        [HttpPut("modelos/{id}/perguntas/ordem")]
        public async Task<IActionResult> Reordenar(Guid id, [FromBody] List<Guid> perguntaIdsNaOrdem)
        {
            ExigirAdmin();
            await _service.ReordenarPerguntasAsync(id, perguntaIdsNaOrdem);
            return NoContent();
        }

        private void ExigirAdmin()
        {
            if (!User.IsInRole(PerfisUsuario.Admin))
                throw new ForbiddenException("Apenas administradores podem gerenciar a Declaração de Saúde.");
        }
    }
}
