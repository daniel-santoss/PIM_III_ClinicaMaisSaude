using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    /// <summary>Falha de autenticação (credenciais inválidas, conta bloqueada). Mapeada para HTTP 401.</summary>
    public class UnauthorizedException : Exception
    {
        public UnauthorizedException(string message) : base(message) { }
    }
}
