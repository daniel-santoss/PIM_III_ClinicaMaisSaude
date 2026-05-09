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
        public bool TemProblemaMemoria { get; private set; }
        public Guid? UsuarioId { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? BloqueadoIAAte { get; private set; }

        public virtual Usuario Usuario { get; private set; }
        public virtual ICollection<Agendamento> Agendamentos { get; private set; } = new List<Agendamento>();
        public virtual ICollection<UsoInadequadoIA> Violacoes { get; private set; } = new List<UsoInadequadoIA>();

        public Paciente(string nome, string cpf, string telefone, string email, bool temProblemaMemoria = false)
        {
            Id = Guid.NewGuid();
            Nome = nome;
            Cpf = cpf;
            Telefone = telefone;
            Email = email;
            Ativo = true;
            TemProblemaMemoria = temProblemaMemoria;
            DtCriado = DateTime.UtcNow;
            BloqueadoIAAte = null;
        }

        public void Atualizar(string nome, string cpf, string telefone, string email, bool temProblemaMemoria)
        {
            Nome = nome;
            Cpf = cpf;
            Telefone = telefone;
            Email = email;
            TemProblemaMemoria = temProblemaMemoria;
        }

        public void Desativar()
        {
            Ativo = false;
        }

        public UsoInadequadoIA RegistrarViolacao(TipoViolacao tipoViolacao, string texto)
        {
            var novaViolacao = new UsoInadequadoIA(Id, tipoViolacao, texto);
            Violacoes.Add(novaViolacao);

            int totalViolacoes = Violacoes.Count;
            if (totalViolacoes == 2)
            {
                BloqueadoIAAte = DateTime.UtcNow.AddDays(1);
            }
            else if (totalViolacoes >= 3)
            {
                BloqueadoIAAte = DateTime.UtcNow.AddDays(7);
            }
            
            return novaViolacao;
        }

        public bool IsIABloqueada()
        {
            return BloqueadoIAAte.HasValue && BloqueadoIAAte.Value > DateTime.UtcNow;
        }

        public void VincularUsuario(Guid usuarioId)
        {
            UsuarioId = usuarioId;
        }

        public void AtualizarNome(string nome) => Nome = nome;
        public void AtualizarEmail(string email) => Email = email;
        public void AtualizarTelefone(string telefone) => Telefone = telefone;
    }
}

