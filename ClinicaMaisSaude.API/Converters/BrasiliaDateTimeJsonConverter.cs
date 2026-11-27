using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.API.Converters
{
    /// <summary>
    /// Todo DateTime do sistema está no horário de Brasília (ver <see cref="Relogio"/>). Na saída,
    /// vai com o deslocamento do fuso (ex.: "2026-11-26T21:12:52.739-03:00"), para o navegador
    /// saber exatamente que instante é. Na entrada, um horário sem fuso já é de Brasília (o
    /// horário escolhido para a consulta); um com fuso ("Z" ou "-03:00") é convertido.
    /// </summary>
    public class BrasiliaDateTimeJsonConverter : JsonConverter<DateTime>
    {
        private static readonly Regex TemFuso = new(@"(Z|[+-]\d{2}:?\d{2})$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var valor = reader.GetString();
            if (string.IsNullOrWhiteSpace(valor)) return default;

            if (TemFuso.IsMatch(valor.Trim()) &&
                DateTimeOffset.TryParse(valor, CultureInfo.InvariantCulture, DateTimeStyles.None, out var comFuso))
                return Relogio.DeUtc(comFuso.UtcDateTime);

            if (DateTime.TryParse(valor, CultureInfo.InvariantCulture, DateTimeStyles.None, out var semFuso))
                return DateTime.SpecifyKind(semFuso, DateTimeKind.Unspecified);

            return default;
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            var brasilia = value.Kind switch
            {
                DateTimeKind.Utc => Relogio.DeUtc(value),
                DateTimeKind.Local => Relogio.DeUtc(value.ToUniversalTime()),
                _ => value
            };
            var comFuso = new DateTimeOffset(brasilia, Relogio.Deslocamento(brasilia));
            writer.WriteStringValue(comFuso.ToString("yyyy-MM-ddTHH:mm:ss.fffzzz", CultureInfo.InvariantCulture));
        }
    }
}
