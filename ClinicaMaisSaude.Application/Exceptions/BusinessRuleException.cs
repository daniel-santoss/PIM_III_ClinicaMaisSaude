using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Violação de regra de negócio (limites, máquina de estados, conflitos). Mapeada para HTTP 400.</summary>
    public class BusinessRuleException : Exception
    {
        public BusinessRuleException(string message) : base(message) { }
    }
}
