using ClinicaMaisSaude.Application.DTOs.Agendamento;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IAgendamentoService
    {
        Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request);
        Task<IEnumerable<AgendamentoResponse>> ObterTodosAsync();
        Task DeletarAsync(Guid id);
    }
}
