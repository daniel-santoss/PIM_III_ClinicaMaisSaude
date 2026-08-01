using ClinicaMaisSaude.Application.DTOs;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Services
{
    public class NotificacaoService : INotificacaoService
    {
        private readonly INotificacaoRepository _notificacaoRepository;

        public NotificacaoService(INotificacaoRepository notificacaoRepository)
        {
            _notificacaoRepository = notificacaoRepository;
        }

        public async Task<IEnumerable<NotificacaoResponse>> ObterNotificacoesAsync(Guid usuarioId)
        {
            var notificacoes = await _notificacaoRepository.ObterPorUsuarioIdAsync(usuarioId);
            return notificacoes.Select(n => new NotificacaoResponse
            {
                Id = n.Id,
                Titulo = n.Titulo,
                Mensagem = n.Mensagem,
                AgendamentoId = n.AgendamentoId,
                Link = n.Link,
                Lida = n.Lida,
                DtCriado = n.DtCriado
            });
        }

        public async Task MarcarComoLidaAsync(Guid id, Guid usuarioId)
        {
            var notificacao = await _notificacaoRepository.ObterPorIdAsync(id);
            if (notificacao == null || notificacao.UsuarioId != usuarioId)
                throw new NotFoundException("Notificação não encontrada ou acesso negado.");

            notificacao.MarcarComoLida();
            await _notificacaoRepository.AtualizarAsync(notificacao);
        }

        public async Task RemoverAsync(Guid id, Guid usuarioId)
        {
            var notificacao = await _notificacaoRepository.ObterPorIdAsync(id);
            if (notificacao == null || notificacao.UsuarioId != usuarioId)
                throw new NotFoundException("Notificação não encontrada ou acesso negado.");

            await _notificacaoRepository.RemoverAsync(notificacao);
        }
    }
}
