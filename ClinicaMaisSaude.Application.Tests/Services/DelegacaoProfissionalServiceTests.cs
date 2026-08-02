using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Services;
using ClinicaMaisSaude.Application.Tests.Fakes;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Tests.Services
{
    public class DelegacaoProfissionalServiceTests
    {
        private static readonly DateTime Escopo = new(2026, 8, 3, 9, 0, 0);

        private readonly FakeProfissionalRepository _profRepo = new();
        private readonly FakeAgendamentoRepository _agRepo = new();
        private readonly FakeConflitoHorarioService _conflito = new();
        private readonly DelegacaoProfissionalService _sut;

        public DelegacaoProfissionalServiceTests()
        {
            _sut = new DelegacaoProfissionalService(_profRepo, _agRepo, _conflito);
        }

        private Profissional AdicionarMedico(int? especialidade = null)
        {
            var prof = new Profissional(Guid.NewGuid(), TipoProfissional.Medico, "Dr. Teste");
            if (especialidade.HasValue)
                prof.Especialidades.Add(new ProfissionalEspecialidade(prof.Id, (EspecialidadeMedica)especialidade.Value));
            _profRepo.Profissionais.Add(prof);
            return prof;
        }

        // Adiciona N agendamentos ativos (Agendado) para o profissional no dia do escopo → afeta NoDia e AtivosGeral.
        private void AdicionarCargaNoDia(Guid profissionalId, int quantidade)
        {
            for (int i = 0; i < quantidade; i++)
            {
                var a = new Agendamento(Guid.NewGuid(), profissionalId, Escopo.AddMinutes(i), TipoProfissional.Medico, TipoConsulta.ConsultaMedica);
                _agRepo.Agendamentos.Add(a);
            }
        }

        // Adiciona N agendamentos ativos em OUTRO dia → afeta só AtivosGeral (não NoDia).
        private void AdicionarCargaOutroDia(Guid profissionalId, int quantidade)
        {
            for (int i = 0; i < quantidade; i++)
            {
                var a = new Agendamento(Guid.NewGuid(), profissionalId, Escopo.AddDays(5).AddMinutes(i), TipoProfissional.Medico, TipoConsulta.ConsultaMedica);
                _agRepo.Agendamentos.Add(a);
            }
        }

        [Fact]
        public async Task Delegar_SemProfissionalDoTipo_LancaBusinessRule()
        {
            var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
                _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, null));

            Assert.Equal("Nenhum profissional deste tipo cadastrado no sistema.", ex.Message);
        }

        [Fact]
        public async Task Delegar_EspecialidadeSemMedico_LancaBusinessRule()
        {
            AdicionarMedico(especialidade: 4); // Tem especialidade 4, mas pedimos a 7

            var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
                _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, especialidadeId: 7));

            Assert.Equal("Nenhum médico com a especialidade solicitada encontrado.", ex.Message);
        }

        [Fact]
        public async Task Delegar_TodosComConflito_LancaBusinessRule()
        {
            var medico = AdicionarMedico();
            _conflito.ProfissionaisComConflito.Add(medico.Id);

            var ex = await Assert.ThrowsAsync<BusinessRuleException>(() =>
                _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, null));

            Assert.Equal("Nenhum profissional disponível neste horário. Tente outro horário.", ex.Message);
        }

        [Fact]
        public async Task Delegar_EscolheProfissionalComMenorCargaNoDia()
        {
            var ocupado = AdicionarMedico();
            var livre = AdicionarMedico();
            AdicionarCargaNoDia(ocupado.Id, 3); // NoDia = 3
            AdicionarCargaNoDia(livre.Id, 1);   // NoDia = 1

            var escolhido = await _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, null);

            Assert.Equal(livre.Id, escolhido);
        }

        [Fact]
        public async Task Delegar_EmpateNoDia_DesempataPorCargaAtivaTotal()
        {
            var maisCarregado = AdicionarMedico();
            var menosCarregado = AdicionarMedico();

            // Mesma carga no dia (1 cada) → empate em NoDia
            AdicionarCargaNoDia(maisCarregado.Id, 1);
            AdicionarCargaNoDia(menosCarregado.Id, 1);
            // Desempate: maisCarregado tem carga ativa extra em outros dias
            AdicionarCargaOutroDia(maisCarregado.Id, 3);

            var escolhido = await _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, null);

            Assert.Equal(menosCarregado.Id, escolhido);
        }

        [Fact]
        public async Task Delegar_IgnoraProfissionalComConflito_EscolheODisponivel()
        {
            var comConflito = AdicionarMedico();
            var disponivel = AdicionarMedico();
            _conflito.ProfissionaisComConflito.Add(comConflito.Id);
            // comConflito teria menor carga, mas está indisponível
            AdicionarCargaNoDia(disponivel.Id, 5);

            var escolhido = await _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, null);

            Assert.Equal(disponivel.Id, escolhido);
        }

        [Fact]
        public async Task Delegar_ComEspecialidade_FiltraApenasMedicoHabilitado()
        {
            var semEspecialidade = AdicionarMedico();
            var comEspecialidade = AdicionarMedico(especialidade: 4);
            // semEspecialidade tem menor carga, mas não atende a especialidade pedida
            AdicionarCargaNoDia(comEspecialidade.Id, 5);

            var escolhido = await _sut.DelegarAsync(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, Escopo, null, especialidadeId: 4);

            Assert.Equal(comEspecialidade.Id, escolhido);
        }
    }
}
