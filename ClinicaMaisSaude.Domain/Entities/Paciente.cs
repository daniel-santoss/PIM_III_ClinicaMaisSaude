using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{

    // Perfil clínico magro. A identidade (Nome/Cpf/Telefone/Email) vive na Pessoa (Thread B).
    // O vínculo com uma conta de acesso (UsuarioId) é OPCIONAL (Fase B4): o proponente do
    // auto-cadastro moderado é um Paciente em EmAnalise, com Pessoa mas SEM login, até o 1º acesso.
    public class Paciente : IAuditavel
    {
        public Guid Id { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;
        public Situacao Situacao { get; private set; }
        public bool TemProblemaMemoria { get; private set; }
        // Conta de acesso — opcional (Fase B4). Nulo enquanto o cadastro está em análise (proponente).
        public Guid? UsuarioId { get; private set; }

        // Identidade (Thread B): a Pessoa é a dona de Nome/Cpf/Email/Telefone. O proponente tem
        // Pessoa (obrigatória) mas ainda não tem conta.
        public Guid? PessoaId { get; private set; }
        public virtual Pessoa? Pessoa { get; private set; }
        public void VincularPessoa(Guid pessoaId) => PessoaId = pessoaId;

        public DateTime DtCriado { get; private set; }

        public virtual Usuario? Usuario { get; private set; }
        public virtual ICollection<Agendamento> Agendamentos { get; private set; } = new List<Agendamento>();

        /// <summary>Só o estado Ativo permite login/uso; qualquer outro bloqueia.</summary>
        public bool EstaAtivo => Situacao == Situacao.Ativo;

        /// <summary>Proponente em análise (sem conta) — não pode logar/usar até ser aprovado.</summary>
        public bool EmAnalise => Situacao == Situacao.EmAnalise;

        protected Paciente() { } // EF Core

        public Paciente(Guid usuarioId, bool temProblemaMemoria = false)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            Situacao = Situacao.Ativo;
            TemProblemaMemoria = temProblemaMemoria;
            DtCriado = DateTime.UtcNow;
        }

        /// <summary>
        /// Cria um proponente (auto-cadastro moderado): Paciente EmAnalise, com Pessoa (identidade)
        /// mas SEM conta de acesso. A conta é criada no 1º acesso, após a aprovação.
        /// </summary>
        public static Paciente NovoProponente(Guid pessoaId, bool temProblemaMemoria = false)
        {
            return new Paciente
            {
                Id = SequentialGuid.Next(),
                PessoaId = pessoaId,
                UsuarioId = null,
                Situacao = Situacao.EmAnalise,
                TemProblemaMemoria = temProblemaMemoria,
                DtCriado = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Ativa o proponente aprovado ao concluir o 1º acesso: vincula a conta recém-criada e
        /// passa a situação para Ativo. Só faz sentido para quem estava EmAnalise.
        /// </summary>
        public void AtivarComConta(Guid usuarioId)
        {
            UsuarioId = usuarioId;
            Situacao = Situacao.Ativo;
        }

        /// <summary>
        /// Reabre um perfil (de uma solicitação anterior recusada/inativa, sem conta) como proponente
        /// em análise — reaproveita a Pessoa (CPF é único) numa nova solicitação de auto-cadastro.
        /// </summary>
        public void ReabrirComoProponente(bool temProblemaMemoria)
        {
            UsuarioId = null;
            Situacao = Situacao.EmAnalise;
            TemProblemaMemoria = temProblemaMemoria;
        }

        public void Atualizar(bool temProblemaMemoria)
        {
            TemProblemaMemoria = temProblemaMemoria;
        }

        /// <summary>Admin desliga a conta (reversível via <see cref="Reativar"/>).</summary>
        public void Desativar()
        {
            Situacao = Situacao.Inativo;
        }

        /// <summary>Soft-delete self-service (o próprio paciente encerra a conta).</summary>
        public void Excluir()
        {
            Situacao = Situacao.Excluido;
        }

        /// <summary>Banimento permanente por abuso (ex.: injeção de IA).</summary>
        public void Banir()
        {
            Situacao = Situacao.Banido;
        }

        /// <summary>Reabilita a conta (Ativo) — usado ao remover penalidade/ban.</summary>
        public void Reativar()
        {
            Situacao = Situacao.Ativo;
        }

    }
}

