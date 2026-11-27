using System;
using System.Text.Json;
using ClinicaMaisSaude.API.Converters;

namespace ClinicaMaisSaude.API.Tests.Converters
{
    public class BrasiliaDateTimeJsonConverterTests
    {
        private static readonly JsonSerializerOptions Opcoes = new() { Converters = { new BrasiliaDateTimeJsonConverter() } };

        private static string Escrever(DateTime valor) => JsonSerializer.Serialize(valor, Opcoes).Trim('"');

        private static DateTime Ler(string valor) => JsonSerializer.Deserialize<DateTime>($"\"{valor}\"", Opcoes);

        [Fact]
        public void Escreve_ComODeslocamentoDeBrasilia()
        {
            Assert.Equal("2026-11-26T21:12:52.739-03:00", Escrever(new DateTime(2026, 11, 26, 21, 12, 52, 739)));
        }

        [Fact]
        public void Escreve_UmValorEmUtcConvertidoParaBrasilia()
        {
            Assert.Equal("2026-11-26T21:12:52.000-03:00",
                Escrever(new DateTime(2026, 11, 27, 0, 12, 52, DateTimeKind.Utc)));
        }

        [Fact]
        public void Le_SemFusoComoHorarioDeBrasilia()
        {
            // É como o portal e o app mandam o horário escolhido para a consulta.
            Assert.Equal(new DateTime(2026, 11, 29, 18, 20, 0), Ler("2026-11-29T18:20:00"));
        }

        [Theory]
        [InlineData("2026-11-29T21:20:00Z")]
        [InlineData("2026-11-29T21:20:00.000Z")]
        [InlineData("2026-11-29T18:20:00-03:00")]
        public void Le_ComFusoConvertendoParaBrasilia(string valor)
        {
            Assert.Equal(new DateTime(2026, 11, 29, 18, 20, 0), Ler(valor));
        }

        [Fact]
        public void IdaEVolta_PreservaOHorario()
        {
            var original = new DateTime(2026, 11, 26, 21, 12, 52, 739);

            Assert.Equal(original, Ler(Escrever(original)));
        }
    }
}
