using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Tests.Common
{
    public class RelogioTests
    {
        [Fact]
        public void DeUtc_ConverteParaOHorarioDeBrasilia()
        {
            // O caso do print: criado às 00:12 de 27/11 em UTC = 21:12 de 26/11 em Brasília.
            var brasilia = Relogio.DeUtc(new DateTime(2026, 11, 27, 0, 12, 52, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2026, 11, 26, 21, 12, 52), brasilia);
            Assert.Equal(DateTimeKind.Unspecified, brasilia.Kind);
        }

        [Fact]
        public void Agora_EstaTresHorasAtrasDoUtc()
        {
            var diferenca = DateTime.UtcNow - Relogio.Agora;

            Assert.InRange(diferenca.TotalMinutes, 179, 181);
        }

        [Fact]
        public void Deslocamento_HojeEMenosTresHoras()
        {
            Assert.Equal(TimeSpan.FromHours(-3), Relogio.Deslocamento(new DateTime(2026, 11, 26, 21, 12, 0)));
        }

        [Fact]
        public void DeUtc_SegueAsRegrasHistoricasDoFuso()
        {
            // Com a base de fusos (IANA ou Windows), o horário de verão de 2018 é respeitado (-2h).
            // No fallback fixo UTC-3 não há essa regra, então o teste não se aplica.
            if (!Relogio.FusoDoSistema) return;

            var brasilia = Relogio.DeUtc(new DateTime(2018, 12, 1, 12, 0, 0, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2018, 12, 1, 10, 0, 0), brasilia);
        }
    }
}
