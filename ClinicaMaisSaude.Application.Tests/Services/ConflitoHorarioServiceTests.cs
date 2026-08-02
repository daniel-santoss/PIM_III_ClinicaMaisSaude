using ClinicaMaisSaude.Application.Services;
using ClinicaMaisSaude.Application.Tests.Fakes;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Tests.Services
{
    public class ConflitoHorarioServiceTests
    {
        private static readonly DateTime Dia = new(2026, 8, 3, 9, 0, 0);
        private readonly FakeAgendamentoRepository _repo = new();
        private readonly ConflitoHorarioService _sut;

        public ConflitoHorarioServiceTests()
        {
            _sut = new ConflitoHorarioService(_repo);
        }

        private Agendamento AdicionarAgendamento(Guid profissionalId, Guid pacienteId, DateTime dataHora, TipoConsulta tipo, StatusAgendamento status = StatusAgendamento.Agendado)
        {
            var a = new Agendamento(pacienteId, profissionalId, dataHora, TipoProfissional.Medico, tipo);
            a.AlterarStatus(status);
            _repo.Agendamentos.Add(a);
            return a;
        }

        [Fact]
        public async Task ExisteConflitoProfissional_SemAgendamentos_Falso()
        {
            var resultado = await _sut.ExisteConflitoProfissionalAsync(Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica, null);

            Assert.False(resultado);
        }

        [Fact]
        public async Task ExisteConflitoProfissional_HorarioSobreposto_Verdadeiro()
        {
            var prof = Guid.NewGuid();
            // Existente 09:00 (ConsultaMedica = 40 min → 09:00-09:40)
            AdicionarAgendamento(prof, Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica);

            // Novo às 09:20 sobrepõe
            var resultado = await _sut.ExisteConflitoProfissionalAsync(prof, Dia.AddMinutes(20), TipoConsulta.ConsultaMedica, null);

            Assert.True(resultado);
        }

        [Fact]
        public async Task ExisteConflitoProfissional_HorarioSemSobreposicao_Falso()
        {
            var prof = Guid.NewGuid();
            AdicionarAgendamento(prof, Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica); // 09:00-09:40

            // Novo às 10:00 não sobrepõe
            var resultado = await _sut.ExisteConflitoProfissionalAsync(prof, Dia.AddHours(1), TipoConsulta.ConsultaMedica, null);

            Assert.False(resultado);
        }

        [Fact]
        public async Task ExisteConflitoProfissional_OutroProfissionalNoMesmoHorario_Falso()
        {
            AdicionarAgendamento(Guid.NewGuid(), Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica);

            // Profissional diferente do que tem agenda ocupada
            var resultado = await _sut.ExisteConflitoProfissionalAsync(Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica, null);

            Assert.False(resultado);
        }

        [Fact]
        public async Task ExisteConflitoProfissional_IgnorarProprioAgendamento_Falso()
        {
            var prof = Guid.NewGuid();
            var existente = AdicionarAgendamento(prof, Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica);

            // Ao reagendar o próprio agendamento para o mesmo horário, ele não deve conflitar consigo mesmo
            var resultado = await _sut.ExisteConflitoProfissionalAsync(prof, Dia, TipoConsulta.ConsultaMedica, existente.Id);

            Assert.False(resultado);
        }

        [Theory]
        [InlineData(StatusAgendamento.Cancelado)]
        [InlineData(StatusAgendamento.Finalizado)]
        [InlineData(StatusAgendamento.Faltou)]
        public async Task ExisteConflitoProfissional_AgendamentoInativo_NaoGeraConflito(StatusAgendamento statusInativo)
        {
            var prof = Guid.NewGuid();
            AdicionarAgendamento(prof, Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica, statusInativo);

            var resultado = await _sut.ExisteConflitoProfissionalAsync(prof, Dia, TipoConsulta.ConsultaMedica, null);

            Assert.False(resultado);
        }

        [Fact]
        public async Task ExisteConflitoPaciente_MesmoPacienteHorarioSobreposto_Verdadeiro()
        {
            var pac = Guid.NewGuid();
            AdicionarAgendamento(Guid.NewGuid(), pac, Dia, TipoConsulta.ConsultaMedica); // 09:00-09:40

            var resultado = await _sut.ExisteConflitoPacienteAsync(pac, Dia.AddMinutes(30), TipoConsulta.ConsultaMedica, null);

            Assert.True(resultado);
        }

        [Fact]
        public async Task ExisteConflitoPaciente_PacienteDiferente_Falso()
        {
            AdicionarAgendamento(Guid.NewGuid(), Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica);

            var resultado = await _sut.ExisteConflitoPacienteAsync(Guid.NewGuid(), Dia, TipoConsulta.ConsultaMedica, null);

            Assert.False(resultado);
        }
    }
}
