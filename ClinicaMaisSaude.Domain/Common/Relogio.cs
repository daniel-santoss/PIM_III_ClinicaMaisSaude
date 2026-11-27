using System;

namespace ClinicaMaisSaude.Domain.Common
{
    /// <summary>
    /// Relógio da clínica: todo horário do sistema (gravado no banco, comparado em regras ou
    /// mostrado ao usuário) é o horário de Brasília. O fuso vem da base do IANA
    /// ("America/Sao_Paulo"), então um eventual retorno do horário de verão é seguido sem
    /// mudar código. Exceção: o vencimento do JWT, que o padrão exige em UTC.
    /// </summary>
    public static class Relogio
    {
        public const string IdIana = "America/Sao_Paulo";

        public static readonly TimeZoneInfo Fuso = ResolverFuso();

        /// <summary>Agora, no horário de Brasília (Kind Unspecified, como volta do banco).</summary>
        public static DateTime Agora => DeUtc(DateTime.UtcNow);

        public static DateTime Hoje => Agora.Date;

        /// <summary>Converte um instante em UTC para o horário de Brasília.</summary>
        public static DateTime DeUtc(DateTime utc) =>
            DateTime.SpecifyKind(
                TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Fuso),
                DateTimeKind.Unspecified);

        /// <summary>Deslocamento de um horário de Brasília em relação ao UTC (hoje, -03:00).</summary>
        public static TimeSpan Deslocamento(DateTime horarioBrasilia) =>
            Fuso.GetUtcOffset(DateTime.SpecifyKind(horarioBrasilia, DateTimeKind.Unspecified));

        /// <summary>True quando o fuso veio da base do sistema; false no fallback fixo UTC-3.</summary>
        public static bool FusoDoSistema { get; private set; }

        private static TimeZoneInfo ResolverFuso()
        {
            // No Windows sem ICU, o mesmo fuso tem o ID "E. South America Standard Time".
            foreach (var id in new[] { IdIana, "E. South America Standard Time" })
            {
                try
                {
                    var fuso = TimeZoneInfo.FindSystemTimeZoneById(id);
                    FusoDoSistema = true;
                    return fuso;
                }
                catch (TimeZoneNotFoundException) { }
                catch (InvalidTimeZoneException) { }
            }

            // Sem base de fusos (imagem mínima): o Brasil não tem horário de verão desde 2019.
            return TimeZoneInfo.CreateCustomTimeZone(IdIana, TimeSpan.FromHours(-3), "Horário de Brasília", "BRT");
        }
    }
}
