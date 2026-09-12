using ClinicaMaisSaude.Application.Exceptions;
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
    public class NotificacoesController : ClinicaControllerBase
    {
        private readonly INotificacaoService _notificacaoService;

        public NotificacoesController(INotificacaoService notificacaoService)
        {
            _notificacaoService = notificacaoService;
        }

        [HttpGet]
        public async Task<IActionResult> ObterTodas()
        {
            var notificacoes = await _notificacaoService.ObterNotificacoesAsync(UsuarioLogadoId);
            return Ok(notificacoes);
        }

        [HttpPatch("{id}/lida")]
        public async Task<IActionResult> MarcarComoLida(Guid id)
        {
            await _notificacaoService.MarcarComoLidaAsync(id, UsuarioLogadoId);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(Guid id)
        {
            await _notificacaoService.RemoverAsync(id, UsuarioLogadoId);
            return NoContent();
        }
    }
}
