using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ClinicaMaisSaude.API.Converters
{
    /// <summary>
    /// Serializa todos os DateTime como UTC com sufixo 'Z', garantindo que o JavaScript
    /// interprete corretamente o fuso horário e exiba no horário local do usuário (ex: UTC-3 Brasília).
    /// </summary>
    public class UtcDateTimeJsonConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            if (value == null) return default;

            if (DateTime.TryParse(value, out var dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            return default;
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            // Se for Local converte, senão força Kind como UTC para evitar soma indevida de fuso
            var utcValue = value.Kind == DateTimeKind.Local 
                ? value.ToUniversalTime() 
                : DateTime.SpecifyKind(value, DateTimeKind.Utc);

            writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
    }
}
