using ClinicaMaisSaude.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    public interface IUsuarioRepository
    {
        Task<Usuario?> ObterPorIdAsync(Guid id);
        Task<string> ObterNomeUsuarioAsync(Guid id);
    }
}
