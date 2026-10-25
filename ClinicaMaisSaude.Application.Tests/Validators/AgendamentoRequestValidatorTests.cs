using System;
using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Application.Validators;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Application.Tests.Validators
{
    // Os tipos chegam como inteiros: valor fora do enum deve virar 400, não erro de FK (500).
    public class AgendamentoRequestValidatorTests
    {
        private readonly AgendamentoRequestValidator _validator = new();

        private static AgendamentoRequest Valido() => new()
        {
            PacienteId = Guid.NewGuid(),
            DataHoraConsulta = DateTime.UtcNow.AddDays(1),
            TipoProfissional = (int)TipoProfissional.Medico,
            TipoConsulta = (int)TipoConsulta.ConsultaMedica,
            EspecialidadeId = (int)EspecialidadeMedica.ClinicaGeral
        };

        [Fact]
        public void RequestValido_Passa()
        {
            Assert.True(_validator.Validate(Valido()).IsValid);
        }

        [Fact]
        public void SemEspecialidade_Passa()
        {
            var request = Valido();
            request.EspecialidadeId = null;
            Assert.True(_validator.Validate(request).IsValid);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(3)]
        public void TipoProfissionalForaDoEnum_Falha(int valor)
        {
            var request = Valido();
            request.TipoProfissional = valor;
            Assert.False(_validator.Validate(request).IsValid);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(6)]
        public void TipoConsultaForaDoEnum_Falha(int valor)
        {
            var request = Valido();
            request.TipoConsulta = valor;
            Assert.False(_validator.Validate(request).IsValid);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(19)]
        public void EspecialidadeForaDoEnum_Falha(int valor)
        {
            var request = Valido();
            request.EspecialidadeId = valor;
            Assert.False(_validator.Validate(request).IsValid);
        }
    }
}
