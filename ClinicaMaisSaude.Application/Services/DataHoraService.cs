using ClinicaMaisSaude.Application.Interfaces;
using System;

namespace ClinicaMaisSaude.Application.Services
{
    /// <summary>
    /// Implementação de <see cref="IDataHoraService"/>. Resolve o fuso de Brasília uma única
    /// vez, tentando o ID do IANA (Linux/macOS) e o do Windows, com fallback para um fuso
    /// fixo UTC-3 — evitando o TimeZoneInfo.FindSystemTimeZoneById inline e frágil entre SOs.
    /// </summary>
    public class DataHoraService : IDataHoraService
    {
        private static readonly TimeZoneInfo FusoBrasilia = ResolverFusoBrasilia();

        public DateTime UtcNow => DateTime.UtcNow;

        public DateTime AgoraBrasilia => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, FusoBrasilia);

        public DateTime ParaBrasilia(DateTime utc)
        {
            var emUtc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTimeFromUtc(emUtc, FusoBrasilia);
        }

        private static TimeZoneInfo ResolverFusoBrasilia()
        {
            foreach (var id in new[] { "America/Sao_Paulo", "E. South America Standard Time" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
                catch (TimeZoneNotFoundException) { }
                catch (InvalidTimeZoneException) { }
            }

            // Fallback: Brasil não observa horário de verão desde 2019, então UTC-3 é estável.
            return TimeZoneInfo.CreateCustomTimeZone("America/Sao_Paulo", TimeSpan.FromHours(-3), "Horário de Brasília", "BRT");
        }
    }
}
