using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    /// <summary>
    /// Cria o administrador inicial em tempo de execução. A senha vem exclusivamente
    /// da configuração (variável de ambiente / user-secrets) — nunca do código-fonte.
    /// Em Development há um fallback para não travar o fluxo local; em produção, a
    /// ausência de senha configurada impede a inicialização (fail-fast).
    /// </summary>
    public static class AdminSeeder
    {
        public static async Task SeedAdminAsync(
            ClinicaDbContext context,
            IConfiguration config,
            bool isDevelopment,
            ILogger logger)
        {
            if (await context.Usuarios.AnyAsync(u => u.TipoUsuario == TipoUsuario.Admin))
                return;

            var email = config[ConfigKeys.AdminSeedEmail] ?? "admin@clinicamaissaude.com.br";
            var cpf = config[ConfigKeys.AdminSeedCpf] ?? "00000000000";
            var senha = config[ConfigKeys.AdminSeedPassword];

            if (string.IsNullOrWhiteSpace(senha))
            {
                if (isDevelopment)
                {
                    senha = "admin123";
                    logger.LogWarning(
                        "AdminSeed:Password não configurado — usando senha padrão de DESENVOLVIMENTO. " +
                        "Configure AdminSeed:Password (variável de ambiente / user-secrets) antes de qualquer ambiente não-local.");
                }
                else
                {
                    throw new InvalidOperationException(
                        "AdminSeed:Password não configurado. Defina a senha do administrador via variável de ambiente ou secret antes de iniciar fora de Development.");
                }
            }

            var senhaHash = BCrypt.Net.BCrypt.HashPassword(senha);

            var admin = new Usuario(email, cpf, senhaHash, "Administrador", null, TipoUsuario.Admin);
            await context.Usuarios.AddAsync(admin);

            var profissionalAdmin = new Profissional(admin.Id, TipoProfissional.Medico, "123456", "SP");
            await context.Profissionais.AddAsync(profissionalAdmin);

            await context.SaveChangesAsync();
            logger.LogInformation("Administrador inicial criado ({Email}).", email);
        }
    }
}
