using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Atalho de DESENVOLVIMENTO: quando <c>Security:ExporCodigosDev</c> está ligado (só em
    /// appsettings.Development.json), loga no console da API o código de verificação gerado — para
    /// testar os fluxos (recuperação, primeiro acesso, verificação de e-mail) sem depender do e-mail.
    /// Em produção a flag fica ausente/false e NADA é logado; o código continua guardado apenas como
    /// HMAC. É um auxílio de dev, não um substituto do e-mail — nunca ligue isto fora de dev.
    /// </summary>
    internal static class CodigoDevLog
    {
        public static void Emitir(IConfiguration config, ILogger logger, TipoVerificacao tipo, string email, string codigo, int expiracaoMin)
        {
            if (bool.TryParse(config[ConfigKeys.ExporCodigosDev], out var ligado) && ligado)
                logger.LogWarning("[DEV] Código {Tipo} para {Email}: {Codigo} (expira em {Min} min)", tipo, email, codigo, expiracaoMin);
        }
    }
}
