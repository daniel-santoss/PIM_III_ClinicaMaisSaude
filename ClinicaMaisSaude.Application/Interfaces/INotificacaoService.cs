using ClinicaMaisSaude.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface INotificacaoService
    {
        Task<IEnumerable<NotificacaoResponse>> ObterNotificacoesAsync(Guid usuarioId);
        Task MarcarComoLidaAsync(Guid id, Guid usuarioId);
        Task RemoverAsync(Guid id, Guid usuarioId);
    }
}
