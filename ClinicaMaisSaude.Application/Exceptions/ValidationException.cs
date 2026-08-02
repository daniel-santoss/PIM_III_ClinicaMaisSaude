using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Entrada inválida (formato, obrigatoriedade). Mapeada para HTTP 400.</summary>
    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }
}
