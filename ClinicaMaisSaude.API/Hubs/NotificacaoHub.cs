using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Hubs
{
    /// <summary>
    /// Canal WebSocket por onde o servidor empurra notificações em tempo real.
    /// Exige autenticação (mesmo JWT das APIs REST). Cada conexão entra num grupo
    /// nomeado pelo Id do usuário logado, de modo que o servidor consegue enviar
    /// uma notificação a TODAS as abas/dispositivos daquele usuário chamando
    /// Clients.Group(usuarioId).
    /// O cliente não invoca métodos aqui — o fluxo é unidirecional (servidor → cliente),
    /// por isso o Hub não expõe métodos públicos além do ciclo de conexão.
    /// </summary>
    [Authorize]
    public class NotificacaoHub : Hub
    {
        /// <summary>Nome do evento enviado ao cliente quando chega uma notificação nova.</summary>
        public const string EventoNotificacao = "NovaNotificacao";

        public override async Task OnConnectedAsync()
        {
            var usuarioId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(usuarioId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, usuarioId);
            }
            await base.OnConnectedAsync();
        }
    }
}
