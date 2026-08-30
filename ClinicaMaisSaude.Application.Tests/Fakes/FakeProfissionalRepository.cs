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
        // A partir da Fase A3b o Profissional não guarda mais TipoProfissional: a categoria vem do
        // Role. O fake guarda o papel ao lado do profissional para reproduzir o filtro do repo real.
        private readonly List<(Profissional Prof, RoleUsuario Role)> _profissionais = new();

        public void AdicionarComRole(Profissional prof, RoleUsuario role) => _profissionais.Add((prof, role));

        public Task<IEnumerable<Profissional>> ObterTodosPorTipoAsync(TipoProfissional tipo)
        {
            var role = PapeisMap.RoleDoTipo(tipo);
            return Task.FromResult(_profissionais.Where(x => x.Role == role).Select(x => x.Prof));
        }

        public Task<Profissional?> ObterPorIdAsync(Guid id)
            => Task.FromResult(_profissionais.Select(x => x.Prof).FirstOrDefault(p => p.Id == id));

        public Task<IEnumerable<Profissional>> ObterTodosAsync()
            => Task.FromResult(_profissionais.Select(x => x.Prof));
    }
}
