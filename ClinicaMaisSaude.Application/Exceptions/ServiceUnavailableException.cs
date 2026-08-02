using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Dependência externa indisponível ou não configurada (ex.: IA/Gemini). Mapeada para HTTP 503.</summary>
    public class ServiceUnavailableException : Exception
    {
        public ServiceUnavailableException(string message) : base(message) { }
    }
}
