using System;

namespace ClinicaMaisSaude.Application.Exceptions
{
    public class RateLimitExceededException : Exception
    {
        public RateLimitExceededException(string message) : base(message)
        {
        }
    }
}
