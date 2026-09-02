namespace ClinicaMaisSaude.Domain.Constants
{
    public static class ConfigKeys
    {
        public const string GeminiApiKey = "GeminiAI:ApiKey";
        public const string GeminiModel = "GeminiAI:Model";
        public const string JwtSecret = "JwtConfig:Secret";
        public const string JwtIssuer = "JwtConfig:Issuer";
        public const string JwtAudience = "JwtConfig:Audience";

        // Valores padrão do JWT quando não configurados (dev). Em produção, sobrescrever via config.
        public const string JwtIssuerPadrao = "ClinicaMaisSaude";
        public const string JwtAudiencePadrao = "ClinicaMaisSaudeApp";
        public const string AdminSeedEmail = "AdminSeed:Email";
        public const string AdminSeedCpf = "AdminSeed:Cpf";
        public const string AdminSeedPassword = "AdminSeed:Password";
        public const string RateLimitGlobal = "RateLimit_Global";
        public const string RateLimitUser = "RateLimit_User_";

        // Envio de e-mail transacional (SMTP). Valores reais em user-secrets (dev) / env (prod).
        // Se EmailHost não estiver configurado, o SmtpEmailService loga o conteúdo em vez de enviar.
        public const string EmailHost = "EmailConfig:Host";
        public const string EmailPort = "EmailConfig:Port";
        public const string EmailUser = "EmailConfig:User";
        public const string EmailPassword = "EmailConfig:Password";
        public const string EmailFrom = "EmailConfig:From";
        public const string EmailFromName = "EmailConfig:FromName";
        // URL pública da logo usada nos e-mails. Se definida, o HTML usa <img src="URL"> (sem anexo);
        // se vazia, cai no fallback de logo embutida (cid) — que o Gmail lista como anexo.
        public const string EmailLogoUrl = "EmailConfig:LogoUrl";

        // Pepper (chave secreta do servidor) do HMAC-SHA256 aplicado ao código de verificação.
        // Fica FORA do banco (config/user-secrets/env) — é o que protege o código curto contra
        // brute force num vazamento do banco. Par conceitual do JwtConfig:Secret.
        public const string CodigoRecuperacaoPepper = "Security:CodigoRecuperacaoPepper";

        // Auxílio de DEV: se "true" (apenas em appsettings.Development.json), a API loga no console o
        // código de verificação gerado, para testar os fluxos sem depender do e-mail. Fora de dev fica
        // ausente/false — o código nunca sai em claro. Ver CodigoDevLog.
        public const string ExporCodigosDev = "Security:ExporCodigosDev";
    }
}
