using ClinicaMaisSaude.Domain.Enums;
using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Profissional : IAuditavel
    {
        public Guid Id { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;
        public Guid UsuarioId { get; private set; }
        public TipoProfissional TipoProfissional { get; private set; }
        public string? Crm { get; private set; }
        public string? UfCrm { get; private set; }
        public DateTime DtCriado { get; private set; }

        public Usuario Usuario { get; private set; }
        public ICollection<ProfissionalEspecialidade> Especialidades { get; private set; } = new List<ProfissionalEspecialidade>();

        protected Profissional() { } // EF Core

        public Profissional(Guid usuarioId, TipoProfissional tipoProfissional, string? crm = null, string? ufCrm = null)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            TipoProfissional = tipoProfissional;
            Crm = crm;
            UfCrm = ufCrm;
            DtCriado = DateTime.UtcNow;
        }

        // Construtor para HasData (onde o Id é pré-definido)
        public Profissional(Guid id, Guid usuarioId, TipoProfissional tipoProfissional, string? crm, string? ufCrm, DateTime dtCriado)
        {
            Id = id;
            UsuarioId = usuarioId;
            TipoProfissional = tipoProfissional;
            Crm = crm;
            UfCrm = ufCrm;
            DtCriado = dtCriado;
        }
    }
}
