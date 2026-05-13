using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificacoesController : ControllerBase
    {
        private readonly INotificacaoService _notificacaoService;

        public NotificacoesController(INotificacaoService notificacaoService)
        {
            _notificacaoService = notificacaoService;
        }

        private Guid ObterUsuarioLogadoId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException("Usuário não autenticado.");
            return Guid.Parse(claim.Value);
        }

        [HttpGet]
        public async Task<IActionResult> ObterTodas()
        {
            var usuarioId = ObterUsuarioLogadoId();
            var notificacoes = await _notificacaoService.ObterNotificacoesAsync(usuarioId);
            return Ok(notificacoes);
        }

        [HttpPatch("{id}/lida")]
        public async Task<IActionResult> MarcarComoLida(Guid id)
        {
            try
            {
                var usuarioId = ObterUsuarioLogadoId();
                await _notificacaoService.MarcarComoLidaAsync(id, usuarioId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(Guid id)
        {
            try
            {
                var usuarioId = ObterUsuarioLogadoId();
                await _notificacaoService.RemoverAsync(id, usuarioId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
