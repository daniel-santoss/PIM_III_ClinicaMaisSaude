using System;

namespace ClinicaMaisSaude.Domain.Entities
{

    public class Paciente
    {
        public Guid Id { get; private set; }
        public string Nome { get; private set; }
        public string Cpf { get; private set; }
        public string Telefone { get; private set; }
        public string Email { get; private set; }
        public bool Ativo { get; private set; }

        public virtual ICollection<Agendamento> Agendamentos { get; private set; } = new List<Agendamento>();

        public Paciente(string nome, string cpf, string telefone, string email)
        {
            Id = Guid.NewGuid();
            Nome = nome;
            Cpf = cpf;
            Telefone = telefone;
            Email = email;
            Ativo = true;
        }

        public void Atualizar(string nome, string cpf, string telefone, string email)
        {
            Nome = nome;
            Cpf = cpf;
            Telefone = telefone;
            Email = email;
        }

        public void Desativar()
        {
            Ativo = false;
        }
    }
}

