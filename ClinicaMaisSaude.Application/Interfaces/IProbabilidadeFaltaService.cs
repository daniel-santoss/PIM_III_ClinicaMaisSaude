using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IProbabilidadeFaltaService
    {
        Task<(double Probabilidade, string Nivel)> CalcularProbabilidadeAsync(Guid pacienteId, DateTime dataAgendamento);
    }
}
