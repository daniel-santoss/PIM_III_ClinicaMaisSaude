using ClinicaMaisSaude.Application.Exceptions;
using Microsoft.Data.SqlClient;
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
            var (status, title, mappedDetail) = Map(exception);

            if (status >= 500)
                _logger.LogError(exception, "Erro não tratado ({TraceId}): {Message}", httpContext.TraceIdentifier, exception.Message);
            else
                _logger.LogWarning("{ExceptionType} ({TraceId}): {Message}", exception.GetType().Name, httpContext.TraceIdentifier, exception.Message);

            // Cada caso mapeado fornece um detalhe seguro para o usuário; só o 500 verdadeiro
            // (não mapeado) cai no texto genérico, para nunca vazar detalhe interno.
            var detail = mappedDetail ?? "Ocorreu um erro interno. Tente novamente em instantes.";

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

        // O terceiro item é o detalhe seguro exibido ao usuário; null significa "usar o texto genérico"
        // (reservado ao 500 não mapeado, para não vazar detalhe interno).
        private static (int Status, string Title, string? Detail) Map(Exception exception) => exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado", exception.Message),
            ValidationException => (StatusCodes.Status400BadRequest, "Requisição inválida", exception.Message),
            BusinessRuleException => (StatusCodes.Status400BadRequest, "Regra de negócio violada", exception.Message),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Acesso negado", exception.Message),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Não autorizado", exception.Message),
            ConflictException => (StatusCodes.Status409Conflict, "Conflito de concorrência", exception.Message),
            RateLimitExceededException => (StatusCodes.Status429TooManyRequests, "Limite de requisições excedido", exception.Message),
            ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Serviço indisponível", exception.Message),

            // Falha de conexão com o banco (ex.: LocalDB instável no dev) chega como SqlException CRUA.
            // Mensagem fixa e segura (não expõe SqlException.Message, que traz servidor/rede internos).
            // Violações de constraint chegam como DbUpdateException e permanecem 500 (sinalizam bug real).
            SqlException => (StatusCodes.Status503ServiceUnavailable, "Banco de dados indisponível",
                "Banco de dados temporariamente indisponível. Tente novamente em instantes."),

            // Exceções de framework já lançadas no código atual, mapeadas para bons status
            // enquanto os demais services não migram para as exceções tipadas.
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado", exception.Message),
            ArgumentException => (StatusCodes.Status400BadRequest, "Requisição inválida", exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Não autorizado", exception.Message),

            _ => (StatusCodes.Status500InternalServerError, "Erro interno", null)
        };
    }
}
