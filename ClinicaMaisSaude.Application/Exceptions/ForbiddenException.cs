using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Autenticado, porém sem permissão para a ação. Mapeada para HTTP 403.</summary>
    public class ForbiddenException : Exception
    {
        public ForbiddenException(string message) : base(message) { }
    }
}
