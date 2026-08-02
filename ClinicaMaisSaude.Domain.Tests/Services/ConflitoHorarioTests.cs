using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;
using System;

namespace ClinicaMaisSaude.Domain.Tests.Services
{
    public class ConflitoHorarioTests
    {
        private static readonly DateTime Base = new(2026, 8, 3, 9, 0, 0);

        // --- Sobreposição por intervalos [inicio, fim) ---

        [Fact]
        public void HaSobreposicao_IntervalosIdenticos_Verdadeiro()
        {
            var inicio = Base;
            var fim = Base.AddMinutes(40);

            Assert.True(ConflitoHorario.HaSobreposicao(inicio, fim, inicio, fim));
        }

        [Fact]
        public void HaSobreposicao_NovoComecaDentroDoExistente_Verdadeiro()
        {
            // Existente 09:00-09:40; novo 09:20-10:00 → começa dentro
            Assert.True(ConflitoHorario.HaSobreposicao(Base.AddMinutes(20), Base.AddMinutes(60), Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_NovoTerminaDentroDoExistente_Verdadeiro()
        {
            // Existente 09:00-09:40; novo 08:40-09:20 → termina dentro
            Assert.True(ConflitoHorario.HaSobreposicao(Base.AddMinutes(-20), Base.AddMinutes(20), Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_NovoEnvolveOExistente_Verdadeiro()
        {
            // Existente 09:00-09:40; novo 08:30-10:00 → envolve totalmente
            Assert.True(ConflitoHorario.HaSobreposicao(Base.AddMinutes(-30), Base.AddMinutes(60), Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_NovoTerminaExatamenteQuandoExistenteComeca_Falso()
        {
            // Novo 08:20-09:00; existente 09:00-09:40 → encostam, mas [inicio, fim) não sobrepõe
            Assert.False(ConflitoHorario.HaSobreposicao(Base.AddMinutes(-40), Base, Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_NovoComecaExatamenteQuandoExistenteTermina_Falso()
        {
            // Existente 09:00-09:40; novo 09:40-10:20 → encostam no fim
            Assert.False(ConflitoHorario.HaSobreposicao(Base.AddMinutes(40), Base.AddMinutes(80), Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_TotalmenteAntes_Falso()
        {
            Assert.False(ConflitoHorario.HaSobreposicao(Base.AddHours(-2), Base.AddHours(-1), Base, Base.AddMinutes(40)));
        }

        [Fact]
        public void HaSobreposicao_TotalmenteDepois_Falso()
        {
            Assert.False(ConflitoHorario.HaSobreposicao(Base.AddHours(2), Base.AddHours(3), Base, Base.AddMinutes(40)));
        }

        // --- Sobreposição contra um Agendamento (usa a duração do tipo de consulta) ---

        [Fact]
        public void HaSobreposicao_ContraAgendamento_UsaDuracaoDoTipoConsulta()
        {
            // ConsultaMedica dura 40 min. Existente 09:00 → ocupa 09:00-09:40.
            var existente = CriarAgendamento(Base, TipoConsulta.ConsultaMedica);

            // Novo 09:30-09:50 sobrepõe os últimos 10 min do existente.
            Assert.True(ConflitoHorario.HaSobreposicao(Base.AddMinutes(30), Base.AddMinutes(50), existente));
            // Novo 09:40-10:00 começa exatamente quando o existente termina → sem conflito.
            Assert.False(ConflitoHorario.HaSobreposicao(Base.AddMinutes(40), Base.AddMinutes(60), existente));
        }

        [Fact]
        public void CalcularFim_AplicaDuracaoPorTipo()
        {
            Assert.Equal(Base.AddMinutes(40), ConflitoHorario.CalcularFim(Base, TipoConsulta.ConsultaMedica));
            Assert.Equal(Base.AddMinutes(20), ConflitoHorario.CalcularFim(Base, TipoConsulta.Triagem));
            Assert.Equal(Base.AddMinutes(15), ConflitoHorario.CalcularFim(Base, TipoConsulta.Vacina));
            Assert.Equal(Base.AddMinutes(30), ConflitoHorario.CalcularFim(Base, TipoConsulta.Exame));
        }

        private static Agendamento CriarAgendamento(DateTime dataHora, TipoConsulta tipoConsulta)
        {
            var tipoProf = tipoConsulta == TipoConsulta.ConsultaMedica || tipoConsulta == TipoConsulta.Retorno
                ? TipoProfissional.Medico
                : TipoProfissional.Enfermeira;

            return new Agendamento(
                pacienteId: Guid.NewGuid(),
                profissionalId: Guid.NewGuid(),
                dataHoraConsulta: dataHora,
                tipoProfissional: tipoProf,
                tipoConsulta: tipoConsulta);
        }
    }
}
