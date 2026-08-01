using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Recurso não encontrado. Mapeada para HTTP 404.</summary>
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }
}
