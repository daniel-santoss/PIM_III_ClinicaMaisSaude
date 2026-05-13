using ClinicaMaisSaude.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface INotificacaoRepository
    {
        Task AdicionarAsync(Notificacao notificacao);
        Task<IEnumerable<Notificacao>> ObterPorUsuarioIdAsync(Guid usuarioId);
        Task<Notificacao?> ObterPorIdAsync(Guid id);
        Task AtualizarAsync(Notificacao notificacao);
        Task RemoverAsync(Notificacao notificacao);
    }
}
