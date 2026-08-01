namespace ClinicaMaisSaude.Domain.Constants
{
    public static class ConfigKeys
    {
        public const string GeminiApiKey = "GeminiAI:ApiKey";
        public const string GeminiModel = "GeminiAI:Model";
        public const string JwtSecret = "JwtConfig:Secret";
        public const string AdminSeedEmail = "AdminSeed:Email";
        public const string AdminSeedCpf = "AdminSeed:Cpf";
        public const string AdminSeedPassword = "AdminSeed:Password";
        public const string RateLimitGlobal = "RateLimit_Global";
        public const string RateLimitUser = "RateLimit_User_";
    }
}
