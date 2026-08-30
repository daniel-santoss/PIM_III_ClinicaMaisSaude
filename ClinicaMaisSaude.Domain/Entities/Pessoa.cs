using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Identidade de uma pessoa física (Nome/Cpf/Email/Telefone), independente de haver ou não
    /// login. Introduzida na Thread B do refactor user-model v2: o <see cref="Usuario"/> (LoginPortal)
    /// passa a ser uma credencial OPCIONAL que referencia uma Pessoa; Paciente/Profissional passam a
    /// referenciar Pessoa. Isso permite o "proponente" — paciente em análise, sem login.
    /// Fase B1 é aditiva: a tabela existe e é preenchida por backfill, mas nenhuma leitura ainda a usa.
    /// </summary>
    public class Pessoa : IAuditavel
    {
        public Guid Id { get; private set; }
        public string Nome { get; private set; }
        public string Cpf { get; private set; }
        public string Email { get; private set; }
        public string? Telefone { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;

        protected Pessoa() { } // EF Core

        public Pessoa(string nome, string cpf, string email, string? telefone = null)
        {
            Id = SequentialGuid.Next();
            Nome = nome;
            Cpf = cpf;
            Email = email;
            Telefone = telefone;
            DtCriado = DateTime.UtcNow;
        }

        // Construtor para cenários com Id pré-definido (ex.: backfill/seed).
        public Pessoa(Guid id, string nome, string cpf, string email, string? telefone, DateTime dtCriado)
        {
            Id = id;
            Nome = nome;
            Cpf = cpf;
            Email = email;
            Telefone = telefone;
            DtCriado = dtCriado;
        }

        public void AtualizarNome(string nome)
        {
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("O nome não pode ser vazio.", nameof(nome));
            Nome = nome;
        }

        public void AtualizarEmail(string email) => Email = email;

        public void AtualizarTelefone(string? telefone) => Telefone = telefone;
    }
}
