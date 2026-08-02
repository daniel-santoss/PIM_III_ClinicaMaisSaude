using ClinicaMaisSaude.API.Hubs;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Services
{
    /// <summary>
    /// Implementação de <see cref="INotificadorTempoReal"/> sobre SignalR.
    /// Envia a notificação apenas ao grupo do usuário destinatário (Id do usuário).
    /// O payload espelha o contrato REST (NotificacaoResponse) para que o front-end
    /// possa inserir a notificação recebida diretamente na mesma lista, sem refazer o fetch.
    /// </summary>
    public class NotificadorTempoRealSignalR : INotificadorTempoReal
    {
        private readonly IHubContext<NotificacaoHub> _hub;
        private readonly ILogger<NotificadorTempoRealSignalR> _logger;

        public NotificadorTempoRealSignalR(IHubContext<NotificacaoHub> hub, ILogger<NotificadorTempoRealSignalR> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        public async Task NotificarAsync(Notificacao notificacao)
        {
            try
            {
                var payload = new
                {
                    id = notificacao.Id,
                    titulo = notificacao.Titulo,
                    mensagem = notificacao.Mensagem,
                    agendamentoId = notificacao.AgendamentoId,
                    link = notificacao.Link,
                    lida = notificacao.Lida,
                    dtCriado = notificacao.DtCriado
                };

                await _hub.Clients
                    .Group(notificacao.UsuarioId.ToString())
                    .SendAsync(NotificacaoHub.EventoNotificacao, payload);
            }
            catch (Exception ex)
            {
                // Best-effort: a notificação já foi persistida. Se o push falhar (usuário
                // offline, erro de transporte), o cliente ainda a verá no próximo carregamento.
                _logger.LogWarning(ex, "Falha ao enviar notificação em tempo real ao usuário {UsuarioId}.", notificacao.UsuarioId);
            }
        }
    }
}
