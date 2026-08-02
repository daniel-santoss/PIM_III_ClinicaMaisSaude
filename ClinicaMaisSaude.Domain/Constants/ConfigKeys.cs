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
    }
}
