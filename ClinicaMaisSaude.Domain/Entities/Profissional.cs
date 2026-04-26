using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Profissional
    {
        public Guid Id { get; private set; }
        public Guid UsuarioId { get; private set; }
        public TipoProfissional TipoProfissional { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual Usuario Usuario { get; private set; }
        public virtual ICollection<Agendamento> Agendamentos { get; private set; }

        public Profissional(Guid usuarioId, TipoProfissional tipoProfissional)
        {
            Id = Guid.NewGuid();
            UsuarioId = usuarioId;
            TipoProfissional = tipoProfissional;
            DtCriado = DateTime.UtcNow;
            Agendamentos = new List<Agendamento>();
        }
    }
}
