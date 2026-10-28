using ClinicaMaisSaude.Domain.Enums;
using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Services;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Profissional : IAuditavel
    {
        public Guid Id { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;
        public Guid UsuarioId { get; private set; }
        public Situacao Situacao { get; private set; }
        public string? Crm { get; private set; }
        public string? UfCrm { get; private set; }

        /// <summary>Turma na escala 12x36: o profissional só recebe consultas nos dias da sua escala.</summary>
        public EscalaTrabalho Escala { get; private set; } = EscalaTrabalho.Escala1;

        // Identidade (Thread B). Aditivo/nulável na Fase B2a: backfill aponta para a Pessoa da conta.
        public Guid? PessoaId { get; private set; }
        public virtual Pessoa? Pessoa { get; private set; }
        public void VincularPessoa(Guid pessoaId) => PessoaId = pessoaId;

        public DateTime DtCriado { get; private set; }

        public Usuario Usuario { get; private set; }
        public ICollection<ProfissionalEspecialidade> Especialidades { get; private set; } = new List<ProfissionalEspecialidade>();

        protected Profissional() { } // EF Core

        public Profissional(Guid usuarioId, string? crm = null, string? ufCrm = null, EscalaTrabalho escala = EscalaTrabalho.Escala1)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            Crm = crm;
            UfCrm = ufCrm;
            Escala = escala;
            Situacao = Situacao.Ativo;
            DtCriado = DateTime.UtcNow;
        }

        // Construtor para HasData (onde o Id é pré-definido)
        public Profissional(Guid id, Guid usuarioId, string? crm, string? ufCrm, DateTime dtCriado)
        {
            Id = id;
            UsuarioId = usuarioId;
            Crm = crm;
            UfCrm = ufCrm;
            Situacao = Situacao.Ativo;
            DtCriado = dtCriado;
        }

        /// <summary>Só o estado Ativo permite operar; qualquer outro desliga o profissional.</summary>
        public bool EstaAtivo => Situacao == Situacao.Ativo;

        /// <summary>Desliga o profissional (ex.: saiu da clínica). Reversível via Reativar.</summary>
        public void Desativar() => Situacao = Situacao.Inativo;

        /// <summary>Reabilita o profissional (Ativo).</summary>
        public void Reativar() => Situacao = Situacao.Ativo;

        public void DefinirEscala(EscalaTrabalho escala) => Escala = escala;

        /// <summary>O dia informado é um dia de plantão da escala deste profissional? (Ausências à parte.)</summary>
        public bool EscaladoNoDia(DateTime dia) => Expediente.EscalaDoDia(dia) == Escala;
    }
}
