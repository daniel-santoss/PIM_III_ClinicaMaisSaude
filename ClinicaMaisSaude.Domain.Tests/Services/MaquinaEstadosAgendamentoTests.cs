using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;
using System;

namespace ClinicaMaisSaude.Domain.Tests.Services
{
    public class MaquinaEstadosAgendamentoTests
    {
        private static readonly DateTime Agora = new(2026, 8, 3, 10, 0, 0);

        private static Agendamento CriarAgendamento(StatusAgendamento status, DateTime dataHoraConsulta, TipoConsulta tipoConsulta = TipoConsulta.ConsultaMedica)
        {
            var agendamento = new Agendamento(
                pacienteId: Guid.NewGuid(),
                profissionalId: Guid.NewGuid(),
                dataHoraConsulta: dataHoraConsulta,
                tipoProfissional: TipoProfissional.Medico,
                tipoConsulta: tipoConsulta);

            agendamento.AlterarStatus(status);
            return agendamento;
        }

        [Theory]
        [InlineData(StatusAgendamento.Agendado, StatusAgendamento.EmAtendimento, true)]
        [InlineData(StatusAgendamento.Agendado, StatusAgendamento.Cancelado, true)]
        [InlineData(StatusAgendamento.Agendado, StatusAgendamento.Finalizado, false)]
        [InlineData(StatusAgendamento.Agendado, StatusAgendamento.RetornoAgendado, false)]
        [InlineData(StatusAgendamento.EmAtendimento, StatusAgendamento.Finalizado, true)]
        [InlineData(StatusAgendamento.EmAtendimento, StatusAgendamento.Cancelado, false)]
        [InlineData(StatusAgendamento.AguardandoRetorno, StatusAgendamento.RetornoAgendado, true)]
        [InlineData(StatusAgendamento.AguardandoRetorno, StatusAgendamento.Cancelado, false)]
        [InlineData(StatusAgendamento.RetornoAgendado, StatusAgendamento.Finalizado, true)]
        [InlineData(StatusAgendamento.RetornoAgendado, StatusAgendamento.Faltou, true)]
        [InlineData(StatusAgendamento.RetornoAgendado, StatusAgendamento.Cancelado, true)]
        [InlineData(StatusAgendamento.RetornoAgendado, StatusAgendamento.EmAtendimento, false)]
        [InlineData(StatusAgendamento.Finalizado, StatusAgendamento.Agendado, false)]
        public void ValidarTransicao_RespeitaMaquinaDeEstados(StatusAgendamento origem, StatusAgendamento destino, bool esperado)
        {
            // Consulta no passado distante para não disparar as regras de tempo (15 min / futuro), que são testadas à parte.
            var agendamento = CriarAgendamento(origem, Agora.AddDays(-1));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, destino, Agora);

            Assert.Equal(esperado, resultado.EhValida);
        }

        [Fact]
        public void ValidarTransicao_EmAtendimentoParaAguardandoRetorno_ValidaSeConsultaMedica()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.EmAtendimento, Agora.AddDays(-1), TipoConsulta.ConsultaMedica);

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.AguardandoRetorno, Agora);

            Assert.True(resultado.EhValida);
        }

        [Fact]
        public void ValidarTransicao_EmAtendimentoParaAguardandoRetorno_InvalidaSeNaoForConsultaMedica()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.EmAtendimento, Agora.AddDays(-1), TipoConsulta.Exame);

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.AguardandoRetorno, Agora);

            Assert.False(resultado.EhValida);
            Assert.Equal("Apenas consultas médicas podem gerar retorno.", resultado.MensagemErro);
        }

        [Fact]
        public void ValidarTransicao_IniciarAtendimento_InvalidaMaisDe15MinutosAntes()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.Agendado, Agora.AddMinutes(30));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.EmAtendimento, Agora);

            Assert.False(resultado.EhValida);
            Assert.Equal("Só é possível iniciar o atendimento a partir de 15 minutos antes do horário agendado.", resultado.MensagemErro);
        }

        [Fact]
        public void ValidarTransicao_IniciarAtendimento_ValidaExatamente15MinutosAntes()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.Agendado, Agora.AddMinutes(15));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.EmAtendimento, Agora);

            Assert.True(resultado.EhValida);
        }

        [Fact]
        public void ValidarTransicao_IniciarAtendimento_ValidaAposHorarioAgendado()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.Agendado, Agora.AddMinutes(-5));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.EmAtendimento, Agora);

            Assert.True(resultado.EhValida);
        }

        [Fact]
        public void ValidarTransicao_RegistrarFalta_InvalidaParaConsultaFutura()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.Agendado, Agora.AddDays(1));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.Faltou, Agora);

            Assert.False(resultado.EhValida);
            Assert.Equal("Não é possível registrar falta em agendamento futuro.", resultado.MensagemErro);
        }

        [Fact]
        public void ValidarTransicao_RegistrarFalta_ValidaParaConsultaPassada()
        {
            var agendamento = CriarAgendamento(StatusAgendamento.Agendado, Agora.AddDays(-1));

            var resultado = MaquinaEstadosAgendamento.ValidarTransicao(agendamento, StatusAgendamento.Faltou, Agora);

            Assert.True(resultado.EhValida);
        }

        [Theory]
        [InlineData(TipoProfissional.Enfermeira, TipoConsulta.Triagem, true)]
        [InlineData(TipoProfissional.Enfermeira, TipoConsulta.Exame, true)]
        [InlineData(TipoProfissional.Enfermeira, TipoConsulta.Vacina, true)]
        [InlineData(TipoProfissional.Enfermeira, TipoConsulta.ConsultaMedica, false)]
        [InlineData(TipoProfissional.Enfermeira, TipoConsulta.Retorno, false)]
        [InlineData(TipoProfissional.Medico, TipoConsulta.ConsultaMedica, true)]
        [InlineData(TipoProfissional.Medico, TipoConsulta.Retorno, true)]
        [InlineData(TipoProfissional.Medico, TipoConsulta.Triagem, false)]
        [InlineData(TipoProfissional.Medico, TipoConsulta.Exame, false)]
        [InlineData(TipoProfissional.Medico, TipoConsulta.Vacina, false)]
        public void ValidarCompatibilidade_RespeitaDivisaoDeCompetencias(TipoProfissional tipo, TipoConsulta consulta, bool esperado)
        {
            var resultado = MaquinaEstadosAgendamento.ValidarCompatibilidade(tipo, consulta);

            Assert.Equal(esperado, resultado.EhValida);
        }
    }
}
