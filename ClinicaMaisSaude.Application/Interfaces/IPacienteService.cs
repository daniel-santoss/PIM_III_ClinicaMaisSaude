using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IPacienteService
    {
        Task<PacienteResponse> AdicionarAsync(PacienteRequest request);

        Task<PacienteResponse?> ObterPorIdAsync(Guid id);

        Task<IEnumerable<PacienteResponse>> ObterTodosAsync(string? nome = null, string? cpf = null, bool incluirProfissionais = false);

        Task<PacienteResponse> AtualizarAsync(Guid id, PacienteRequest request);

        Task DesativarAsync(Guid id);
    }

}
