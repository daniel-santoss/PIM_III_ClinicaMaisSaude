using ClinicaMaisSaude.Domain.Entities;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    /// <summary>
    /// Envia uma notificação recém-criada ao usuário destinatário em tempo real
    /// (push), dispensando o polling do front-end. A implementação (SignalR na
    /// camada de API) é best-effort: uma falha de push NUNCA deve interromper a
    /// persistência que a originou — a notificação já está gravada e será exibida
    /// no próximo carregamento mesmo que o push falhe.
    /// </summary>
    public interface INotificadorTempoReal
    {
        Task NotificarAsync(Notificacao notificacao);
    }
}
