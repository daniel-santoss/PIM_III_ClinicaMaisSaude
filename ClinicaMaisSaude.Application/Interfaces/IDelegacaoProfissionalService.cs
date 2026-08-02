using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Escolhe o profissional que atenderá um agendamento (balanceamento de carga):
    /// entre os profissionais do tipo/especialidade sem conflito no horário, seleciona o
    /// de menor carga no dia, usando a carga ativa total como critério de desempate.
    /// </summary>
    public interface IDelegacaoProfissionalService
    {
        Task<Guid> DelegarAsync(TipoProfissional tipo, TipoConsulta consulta, DateTime escopoHorario, Guid? ignorarAgendamentoId, int? especialidadeId);
    }
}
