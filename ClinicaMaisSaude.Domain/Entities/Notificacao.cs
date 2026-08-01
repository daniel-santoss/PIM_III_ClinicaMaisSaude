using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Notificacao
    {
        public Guid Id { get; private set; }
        public Guid UsuarioId { get; private set; }
        public string Titulo { get; private set; }
        public string Mensagem { get; private set; }
        public Guid? AgendamentoId { get; private set; }
        public string? Link { get; private set; }
        public bool Lida { get; private set; }
        public DateTime DtCriado { get; private set; }

        public Notificacao(Guid usuarioId, string titulo, string mensagem, Guid? agendamentoId = null, string? link = null)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            Titulo = titulo;
            Mensagem = mensagem;
            AgendamentoId = agendamentoId;
            Link = link;
            Lida = false;
            DtCriado = DateTime.UtcNow;
        }

        public void MarcarComoLida()
        {
            Lida = true;
        }
    }
}
