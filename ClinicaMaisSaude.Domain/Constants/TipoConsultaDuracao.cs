using ClinicaMaisSaude.Domain.Enums;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Domain.Constants
{
    public static class TipoConsultaDuracao
    {
        private static readonly Dictionary<TipoConsulta, int> _duracoesEmMinutos = new()
        {
            { TipoConsulta.Triagem, 20 },
            { TipoConsulta.Vacina, 15 },
            { TipoConsulta.Exame, 30 },
            { TipoConsulta.ConsultaMedica, 40 },
            { TipoConsulta.Retorno, 20 }
        };

        public static int ObterDuracao(TipoConsulta tipoConsulta)
        {
            if (_duracoesEmMinutos.TryGetValue(tipoConsulta, out var duracao))
            {
                return duracao;
            }
            
            return 30; // fallback seguro
        }
    }
}
