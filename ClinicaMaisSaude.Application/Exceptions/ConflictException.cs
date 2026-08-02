using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>
    /// Conflito de concorrência: o registro foi alterado por outra operação entre a
    /// leitura e a gravação (token de concorrência / RowVersion divergente).
    /// Mapeada para HTTP 409.
    /// </summary>
    public class ConflictException : Exception
    {
        public ConflictException(string message) : base(message) { }
    }
}
