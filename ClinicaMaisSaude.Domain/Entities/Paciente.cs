using System;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Entities
{

    // Perfil clínico. A identidade (Nome/Cpf/Telefone/Email) vive no LoginPortal (Usuario);
    // um Paciente sempre referencia uma conta (UsuarioId obrigatório) — não há paciente sem login.
    public class Paciente
    {
        public Guid Id { get; private set; }
        public SituacaoCliente SituacaoCliente { get; private set; }
        public bool TemProblemaMemoria { get; private set; }
        public Guid UsuarioId { get; private set; }
        public DateTime DtCriado { get; private set; }
        public DateTime? BloqueadoIAAte { get; private set; }
        /// <summary>True enquanto o paciente ainda não foi notificado de que a penalidade foi removida pelo admin</summary>
        public bool PenalidadeRemovidaAvisar { get; private set; }

        public virtual Usuario Usuario { get; private set; }
        public virtual ICollection<Agendamento> Agendamentos { get; private set; } = new List<Agendamento>();

        /// <summary>Só o estado Ativo permite login/uso; qualquer outro bloqueia.</summary>
        public bool EstaAtivo => SituacaoCliente == SituacaoCliente.Ativo;

        protected Paciente() { } // EF Core

        public Paciente(Guid usuarioId, bool temProblemaMemoria = false)
        {
            Id = SequentialGuid.Next();
            UsuarioId = usuarioId;
            SituacaoCliente = SituacaoCliente.Ativo;
            TemProblemaMemoria = temProblemaMemoria;
            DtCriado = DateTime.UtcNow;
            BloqueadoIAAte = null;
        }

        public void Atualizar(bool temProblemaMemoria)
        {
            TemProblemaMemoria = temProblemaMemoria;
        }

        /// <summary>Admin desliga a conta (reversível via <see cref="Reativar"/>).</summary>
        public void Desativar()
        {
            SituacaoCliente = SituacaoCliente.Desativado;
        }

        /// <summary>Soft-delete self-service (o próprio paciente encerra a conta).</summary>
        public void Excluir()
        {
            SituacaoCliente = SituacaoCliente.Excluido;
        }

        /// <summary>Banimento permanente por abuso (ex.: injeção de IA).</summary>
        public void Banir()
        {
            SituacaoCliente = SituacaoCliente.Banido;
        }

        /// <summary>Reabilita a conta (Ativo) — usado ao remover penalidade/ban.</summary>
        public void Reativar()
        {
            SituacaoCliente = SituacaoCliente.Ativo;
        }

        public void BloquearIA(DateTime ate)
        {
            BloqueadoIAAte = ate;
        }

        public bool IsIABloqueada()
        {
            return BloqueadoIAAte.HasValue && BloqueadoIAAte.Value > DateTime.UtcNow;
        }

        /// <summary>Admin remove a penalidade e agenda o aviso para o próximo login do paciente</summary>
        public void RemoverPenalidade()
        {
            BloqueadoIAAte = null;
            PenalidadeRemovidaAvisar = true;
        }

        /// <summary>Chamado após exibir o aviso ao paciente, para não rexibir</summary>
        public void ConsumarAvisoPenalidade()
        {
            PenalidadeRemovidaAvisar = false;
        }

    }
}

