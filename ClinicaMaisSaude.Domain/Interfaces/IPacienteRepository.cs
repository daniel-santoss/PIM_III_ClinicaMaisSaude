using ClinicaMaisSaude.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IPacienteRepository
    {
        // O "Async" no nome do método para lembrar de colocar o "await" ao ser chamado
        Task AdicionarAsync(Paciente paciente);
        Task<Paciente?> ObterPorIdAsync(Guid id) ;
        Task<Paciente?> ObterPorCpfAsync(string cpf);

    }
}
