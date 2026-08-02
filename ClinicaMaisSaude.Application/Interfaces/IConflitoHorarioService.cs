using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Detecta conflitos de horário (sobreposição de agendamentos ativos) para um
    /// profissional ou paciente. Carrega apenas a janela relevante do banco e aplica
    /// a regra pura de sobreposição do domínio.
    /// </summary>
    public interface IConflitoHorarioService
    {
        Task<bool> ExisteConflitoProfissionalAsync(Guid profissionalId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId);
        Task<bool> ExisteConflitoPacienteAsync(Guid pacienteId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId);
    }
}
