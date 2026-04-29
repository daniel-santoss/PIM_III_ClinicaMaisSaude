using ClinicaMaisSaude.Application.DTOs.Agendamento;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AgendamentoHistorico;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IAgendamentoService
    {
        Task<AgendamentoResponse> AdicionarAsync(AgendamentoRequest request, Guid usuarioLogadoId);
        Task<AgendamentoResponse> AtualizarAsync(Guid id, AgendamentoRequest request, Guid usuarioLogadoId);
        Task<AgendamentoResponse> AlterarStatusAsync(Guid id, int novoStatusInt, Guid usuarioLogadoId);
        Task<IEnumerable<AgendamentoResponse>> ObterTodosAsync();
        Task<List<string>> ObterHorariosDisponiveisAsync(DateTime data, int tipoConsultaInt);
        Task<AgendamentoResponse> ObterPorIdAsync(Guid id);
        Task<AgendamentoResponse> RemarcarAsync(Guid id, RemarcarAgendamentoRequest request, Guid usuarioLogadoId);
        Task DeletarAsync(Guid id, Guid usuarioLogadoId);
        Task<IEnumerable<AgendamentoHistoricoResponse>> ObterHistoricoAsync(Guid agendamentoId);
    }
}
