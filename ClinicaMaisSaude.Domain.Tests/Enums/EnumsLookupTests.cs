using System;
using System.Linq;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Tests.Enums
{
    // Os enums espelhados em tabelas lookup são as chaves dessas tabelas e o contrato numérico
    // da API. Todos começam em 1 e são sequenciais: um 0 vira "falso" no JavaScript (o caso da
    // Clínica Geral) e um buraco na sequência quebraria a correspondência com a lookup.
    public class EnumsLookupTests
    {
        public static TheoryData<Type> EnumsComLookup => new()
        {
            typeof(StatusAgendamento),
            typeof(TipoConsulta),
            typeof(TipoProfissional),
            typeof(EspecialidadeMedica),
            typeof(Situacao),
            typeof(RoleUsuario),
            typeof(StatusSolicitacao),
            typeof(TipoEventoHistorico),
            typeof(TipoViolacao),
            typeof(TipoVerificacao),
            typeof(EscalaTrabalho),
        };

        [Theory]
        [MemberData(nameof(EnumsComLookup))]
        public void Enum_ComecaEmUm_ESemBuracos(Type tipo)
        {
            var valores = Enum.GetValues(tipo).Cast<int>().OrderBy(v => v).ToArray();
            Assert.Equal(Enumerable.Range(1, valores.Length), valores);
        }
    }
}
