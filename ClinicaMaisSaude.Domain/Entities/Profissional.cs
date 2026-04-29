using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Profissional
    {
        public Guid Id { get; private set; }
        public Guid UsuarioId { get; private set; }
        public TipoProfissional TipoProfissional { get; private set; }
        public string Nome { get; private set; }
        public string? Crm { get; private set; }
        public string? UfCrm { get; private set; }
        public DateTime DtCriado { get; private set; }

        public Usuario Usuario { get; private set; }

        protected Profissional() { } // EF Core

        public Profissional(Guid usuarioId, TipoProfissional tipoProfissional, string nome, string? crm = null, string? ufCrm = null)
        {
            Id = Guid.NewGuid();
            UsuarioId = usuarioId;
            TipoProfissional = tipoProfissional;
            Nome = nome;
            Crm = crm;
            UfCrm = ufCrm;
            DtCriado = DateTime.UtcNow;
        }

        // Construtor para HasData (onde o Id é pré-definido)
        public Profissional(Guid id, Guid usuarioId, TipoProfissional tipoProfissional, string nome, string? crm, string? ufCrm, DateTime dtCriado)
        {
            Id = id;
            UsuarioId = usuarioId;
            TipoProfissional = tipoProfissional;
            Nome = nome;
            Crm = crm;
            UfCrm = ufCrm;
            DtCriado = dtCriado;
        }
    }
}
