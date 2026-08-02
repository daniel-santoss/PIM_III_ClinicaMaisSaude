using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Tests.Fakes
{
    /// <summary>
    /// Fake do IConflitoHorarioService: reporta conflito para os profissionais/pacientes
    /// cujos ids forem adicionados aos conjuntos. Permite testar a lógica de seleção da
    /// delegação isoladamente, sem depender da regra de sobreposição real.
    /// </summary>
    public class FakeConflitoHorarioService : IConflitoHorarioService
    {
        public HashSet<Guid> ProfissionaisComConflito { get; } = new();
        public HashSet<Guid> PacientesComConflito { get; } = new();

        public Task<bool> ExisteConflitoProfissionalAsync(Guid profissionalId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId)
            => Task.FromResult(ProfissionaisComConflito.Contains(profissionalId));

        public Task<bool> ExisteConflitoPacienteAsync(Guid pacienteId, DateTime novoInicio, TipoConsulta novaConsulta, Guid? ignorarAgendamentoId)
            => Task.FromResult(PacientesComConflito.Contains(pacienteId));
    }
}
