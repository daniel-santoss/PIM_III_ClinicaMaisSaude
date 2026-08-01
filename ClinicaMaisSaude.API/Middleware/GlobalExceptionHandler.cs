using ClinicaMaisSaude.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Middleware
{
    /// <summary>
    /// Captura qualquer exceção não tratada e devolve uma resposta padronizada
    /// (RFC 7807 / ProblemDetails) com o status HTTP correto. Mantém o campo
    /// "message" na raiz por compatibilidade com o front-end existente, que lê
    /// esse campo (inclusive o prefixo "PERMANENT_BAN:").
    /// </summary>
    public class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;

        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
        {
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            var (status, title) = Map(exception);

            if (status >= 500)
                _logger.LogError(exception, "Erro não tratado ({TraceId}): {Message}", httpContext.TraceIdentifier, exception.Message);
            else
                _logger.LogWarning("{ExceptionType} ({TraceId}): {Message}", exception.GetType().Name, httpContext.TraceIdentifier, exception.Message);

            // Em 500 não vaza detalhe interno; nos demais, a mensagem é de negócio e pode ir ao usuário.
            var detail = status >= 500 ? "Ocorreu um erro interno. Tente novamente em instantes." : exception.Message;

            var payload = new Dictionary<string, object?>
            {
                ["title"] = title,
                ["status"] = status,
                ["detail"] = detail,
                ["message"] = detail, // compat com o front (lê errorData.message)
                ["traceId"] = httpContext.TraceIdentifier
            };

            httpContext.Response.StatusCode = status;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(payload, cancellationToken);

            return true;
        }

        private static (int Status, string Title) Map(Exception exception) => exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado"),
            ValidationException => (StatusCodes.Status400BadRequest, "Requisição inválida"),
            BusinessRuleException => (StatusCodes.Status400BadRequest, "Regra de negócio violada"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Acesso negado"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Não autorizado"),
            RateLimitExceededException => (StatusCodes.Status429TooManyRequests, "Limite de requisições excedido"),
            ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Serviço indisponível"),

            // Exceções de framework já lançadas no código atual, mapeadas para bons status
            // enquanto os demais services não migram para as exceções tipadas.
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Requisição inválida"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Não autorizado"),

            _ => (StatusCodes.Status500InternalServerError, "Erro interno")
        };
    }
}
