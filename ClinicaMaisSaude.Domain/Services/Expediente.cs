using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Services
{
    /// <summary>
    /// Expediente da clínica e escala 12x36. A clínica abre todos os dias, das 07:00 às 19:00,
    /// com pausa fixa das 12:00 às 13:00. Cada profissional pertence a uma das duas escalas, que
    /// se revezam dia sim, dia não: a escala do dia é calculada a partir de uma data de referência,
    /// então não existe uma tabela de plantões a manter. A alternância é contínua (não segue a
    /// paridade do dia do mês), para que ninguém trabalhe dois dias seguidos na virada de um mês
    /// de 31 dias.
    /// </summary>
    public static class Expediente
    {
        public static readonly TimeSpan Inicio = new(7, 0, 0);
        public static readonly TimeSpan Fim = new(19, 0, 0);
        public static readonly TimeSpan InicioPausa = new(12, 0, 0);
        public static readonly TimeSpan FimPausa = new(13, 0, 0);

        /// <summary>Dia em que a Escala 1 trabalha; a partir dele as escalas se alternam.</summary>
        public static readonly DateTime ReferenciaEscala = new(2026, 1, 1);

        /// <summary>Escala que trabalha no dia informado (o horário é ignorado).</summary>
        public static EscalaTrabalho EscalaDoDia(DateTime dia)
        {
            var dias = (dia.Date - ReferenciaEscala).Days;
            // Módulo positivo também para datas anteriores à referência.
            return ((dias % 2) + 2) % 2 == 0 ? EscalaTrabalho.Escala1 : EscalaTrabalho.Escala2;
        }

        /// <summary>Primeiro dia (a partir da referência) em que a escala trabalha.</summary>
        public static DateTime PrimeiroDiaDaEscala(EscalaTrabalho escala) =>
            escala == EscalaTrabalho.Escala1 ? ReferenciaEscala : ReferenciaEscala.AddDays(1);

        /// <summary>O intervalo [inicio, fim) cai dentro do expediente e fora da pausa?</summary>
        public static bool DentroDoExpediente(TimeSpan inicio, TimeSpan fim) =>
            inicio >= Inicio && fim <= Fim &&
            !ConflitoHorario.HaSobreposicao(DateTime.MinValue.Add(inicio), DateTime.MinValue.Add(fim),
                DateTime.MinValue.Add(InicioPausa), DateTime.MinValue.Add(FimPausa));
    }
}
