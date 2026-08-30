using ClinicaMaisSaude.Domain.Enums;
using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class Agendamento : IAuditavel
    {
        public Guid Id { get; private set; }
        public DateTime? UltAtualizacao { get; private set; }
        public void MarcarAtualizacao(DateTime quando) => UltAtualizacao = quando;
        public DateTime DataHoraConsulta { get; private set; }
        public Guid PacienteId { get; private set; }
        public Guid ProfissionalId { get; private set; }
        public TipoProfissional TipoProfissional { get; private set; }
        public TipoConsulta TipoConsulta { get; private set; }
        public StatusAgendamento Status { get; private set; }
        public Guid? AgendamentoOrigemId { get; private set; }
        public EspecialidadeMedica? EspecialidadeId { get; private set; }
        public double ProbabilidadeFalta { get; private set; }
        public bool ResultadoDisponivel { get; private set; }
        public bool ExigeResultadoPosterior { get; private set; }
        public bool ResultadoRetirado { get; private set; }
        public bool NotificacaoPendenteGerada { get; private set; }
        public bool LembreteManhaEnviado { get; private set; }
        public bool LembreteDuasHorasEnviado { get; private set; }
        public DateTime DtCriado { get; private set; }

        // Token de concorrência otimista (SQL Server rowversion). Gerenciado pelo EF/banco:
        // se a linha for alterada por outra operação entre a leitura e o SaveChanges, o
        // update falha com DbUpdateConcurrencyException (evita "lost update" no mesmo agendamento).
        public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

        public virtual Paciente Paciente { get; private set; }
        // Profissional responsável (FK ProfissionalId, obrigatória). Só materializado via .Include.
        public virtual Profissional Profissional { get; private set; }
        // Agendamento de origem na cadeia de retorno/remarcação (auto-referência, opcional).
        public virtual Agendamento? AgendamentoOrigem { get; private set; }

        public Agendamento(Guid pacienteId, Guid profissionalId, DateTime dataHoraConsulta,
            TipoProfissional tipoProfissional, TipoConsulta tipoConsulta, Guid? agendamentoOrigemId = null)
        {
            Id = SequentialGuid.Next();
            PacienteId = pacienteId;
            ProfissionalId = profissionalId;
            DataHoraConsulta = dataHoraConsulta;
            TipoProfissional = tipoProfissional;
            TipoConsulta = tipoConsulta;
            AgendamentoOrigemId = agendamentoOrigemId;
            Status = StatusAgendamento.Agendado;
            ProbabilidadeFalta = 0;
            ResultadoDisponivel = false;
            ExigeResultadoPosterior = false;
            ResultadoRetirado = false;
            NotificacaoPendenteGerada = false;
            LembreteManhaEnviado = false;
            LembreteDuasHorasEnviado = false;
            DtCriado = DateTime.UtcNow;
        }

        public void AlterarStatus(StatusAgendamento novoStatus)
        {
            Status = novoStatus;
        }

        public void AlterarDataHora(DateTime novaDataHora)
        {
            DataHoraConsulta = novaDataHora;
        }

        public void ExigirResultadoPosterior()
        {
            ExigeResultadoPosterior = true;
        }

        public void MarcarResultadoDisponivel()
        {
            ResultadoDisponivel = true;
        }

        public void MarcarResultadoRetirado()
        {
            ResultadoRetirado = true;
        }

        public void AtualizarProbabilidadeFalta(double probabilidade)
        {
            ProbabilidadeFalta = probabilidade;
        }

        public void MarcarNotificacaoPendenteGerada()
        {
            NotificacaoPendenteGerada = true;
        }

        public void MarcarLembreteManhaEnviado()
        {
            LembreteManhaEnviado = true;
        }

        public void MarcarLembreteDuasHorasEnviado()
        {
            LembreteDuasHorasEnviado = true;
        }

        public void DefinirEspecialidade(int? especialidadeId)
        {
            // O DTO trafega int? (índice do enum); aqui vira o tipo forte que casa com o FK.
            EspecialidadeId = especialidadeId.HasValue ? (EspecialidadeMedica?)especialidadeId.Value : null;
        }
    }
}
