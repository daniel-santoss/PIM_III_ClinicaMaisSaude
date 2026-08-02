using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Services
{
    /// <summary>
    /// Regra pura de sobreposição de janelas de tempo entre agendamentos. Cada tipo de
    /// consulta tem uma duração própria (<see cref="TipoConsultaDuracao"/>), então o
    /// conflito é calculado como interseção de intervalos [início, fim). Sem I/O — recebe
    /// os dados já carregados e decide, o que a torna diretamente testável.
    /// </summary>
    public static class ConflitoHorario
    {
        /// <summary>
        /// Há sobreposição entre o novo intervalo [novoInicio, novoFim) e o intervalo do
        /// agendamento existente (cuja duração vem do seu TipoConsulta)?
        /// </summary>
        public static bool HaSobreposicao(DateTime novoInicio, DateTime novoFim, Agendamento existente)
        {
            var fimExistente = existente.DataHoraConsulta.AddMinutes(TipoConsultaDuracao.ObterDuracao(existente.TipoConsulta));
            return HaSobreposicao(novoInicio, novoFim, existente.DataHoraConsulta, fimExistente);
        }

        /// <summary>Interseção de dois intervalos [inícioA, fimA) e [inícioB, fimB).</summary>
        public static bool HaSobreposicao(DateTime inicioA, DateTime fimA, DateTime inicioB, DateTime fimB)
        {
            return (inicioA >= inicioB && inicioA < fimB) ||
                   (fimA > inicioB && fimA <= fimB) ||
                   (inicioA <= inicioB && fimA >= fimB);
        }

        /// <summary>Calcula o fim de um agendamento a partir do seu tipo de consulta.</summary>
        public static DateTime CalcularFim(DateTime inicio, TipoConsulta tipoConsulta)
            => inicio.AddMinutes(TipoConsultaDuracao.ObterDuracao(tipoConsulta));
    }
}
