using System;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;

namespace ClinicaMaisSaude.Domain.Tests.Services
{
    // Escala 12x36 e expediente da clínica (07:00–19:00, pausa 12:00–13:00, todos os dias).
    public class ExpedienteTests
    {
        [Fact]
        public void EscalaDoDia_NaReferencia_EhEscala1()
        {
            Assert.Equal(EscalaTrabalho.Escala1, Expediente.EscalaDoDia(Expediente.ReferenciaEscala));
            Assert.Equal(EscalaTrabalho.Escala2, Expediente.EscalaDoDia(Expediente.ReferenciaEscala.AddDays(1)));
        }

        [Fact]
        public void EscalaDoDia_AlternaSemQuebraNaViradaDeMesDe31Dias()
        {
            // 31/10 e 01/11 são ambos ímpares, mas a escala precisa alternar mesmo assim.
            var dia31 = new DateTime(2026, 10, 31);
            Assert.NotEqual(Expediente.EscalaDoDia(dia31), Expediente.EscalaDoDia(dia31.AddDays(1)));
        }

        [Fact]
        public void EscalaDoDia_DuasSemanasSeguidas_NuncaRepeteEmDiasConsecutivos()
        {
            var dia = new DateTime(2026, 12, 25);
            for (var i = 0; i < 14; i++, dia = dia.AddDays(1))
                Assert.NotEqual(Expediente.EscalaDoDia(dia), Expediente.EscalaDoDia(dia.AddDays(1)));
        }

        [Fact]
        public void EscalaDoDia_IgnoraOHorarioEFuncionaAntesDaReferencia()
        {
            var manha = new DateTime(2026, 3, 10, 7, 0, 0);
            var noite = new DateTime(2026, 3, 10, 18, 40, 0);
            Assert.Equal(Expediente.EscalaDoDia(manha), Expediente.EscalaDoDia(noite));

            // 31/12/2025 é o dia anterior à referência: Escala 2.
            Assert.Equal(EscalaTrabalho.Escala2, Expediente.EscalaDoDia(new DateTime(2025, 12, 31)));
        }

        [Theory]
        [InlineData(7, 0, 40, true)]    // primeiro horário do dia
        [InlineData(18, 20, 40, true)]  // termina exatamente às 19:00
        [InlineData(18, 40, 40, false)] // passa das 19:00
        [InlineData(6, 40, 20, false)]  // antes da abertura
        [InlineData(11, 40, 40, false)] // invade a pausa
        [InlineData(12, 20, 20, false)] // dentro da pausa
        [InlineData(13, 0, 20, true)]   // logo após a pausa
        public void DentroDoExpediente(int hora, int minuto, int duracao, bool esperado)
        {
            var inicio = new TimeSpan(hora, minuto, 0);
            Assert.Equal(esperado, Expediente.DentroDoExpediente(inicio, inicio.Add(TimeSpan.FromMinutes(duracao))));
        }

        [Fact]
        public void Profissional_EscaladoSoNosDiasDaSuaEscala()
        {
            var prof = new Profissional(Guid.NewGuid(), escala: EscalaTrabalho.Escala2);
            var diaEscala1 = Expediente.ReferenciaEscala;

            Assert.False(prof.EscaladoNoDia(diaEscala1));
            Assert.True(prof.EscaladoNoDia(diaEscala1.AddDays(1)));

            prof.DefinirInicioPlantoes(diaEscala1);
            Assert.Equal(EscalaTrabalho.Escala1, prof.Escala);
            Assert.True(prof.EscaladoNoDia(diaEscala1));
        }

        [Fact]
        public void Profissional_PrimeiroPlantaoDefineAEscalaEBloqueiaOsDiasAnteriores()
        {
            var inicio = new DateTime(2026, 11, 4);
            var prof = new Profissional(Guid.NewGuid(), inicioPlantoes: inicio.AddHours(10));

            Assert.Equal(inicio, prof.InicioPlantoes); // só a data
            Assert.Equal(Expediente.EscalaDoDia(inicio), prof.Escala);
            Assert.False(prof.EscaladoNoDia(inicio.AddDays(-2))); // mesma escala, mas antes de começar
            Assert.True(prof.EscaladoNoDia(inicio));
            Assert.False(prof.EscaladoNoDia(inicio.AddDays(1)));
            Assert.True(prof.EscaladoNoDia(inicio.AddDays(2)));
        }
    }
}
