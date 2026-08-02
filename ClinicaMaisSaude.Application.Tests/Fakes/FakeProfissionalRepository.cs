using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Tests.Fakes
{
    /// <summary>Fake em memória do IProfissionalRepository para testes de delegação.</summary>
    public class FakeProfissionalRepository : IProfissionalRepository
    {
        public List<Profissional> Profissionais { get; } = new();

        public Task<IEnumerable<Profissional>> ObterTodosPorTipoAsync(TipoProfissional tipo)
            => Task.FromResult(Profissionais.Where(p => p.TipoProfissional == tipo));

        public Task<Profissional?> ObterPorIdAsync(Guid id)
            => Task.FromResult(Profissionais.FirstOrDefault(p => p.Id == id));

        public Task<IEnumerable<Profissional>> ObterTodosAsync()
            => Task.FromResult(Profissionais.AsEnumerable());
    }
}
