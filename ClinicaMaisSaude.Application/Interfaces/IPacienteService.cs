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

        Task<IEnumerable<PacienteResponse>> ObterTodosAsync();
    }

}
