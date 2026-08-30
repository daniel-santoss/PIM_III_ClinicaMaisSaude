using System;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    /// <summary>
    /// Semeia um modelo de Declaração de Saúde de EXEMPLO em Development, apenas se ainda não houver
    /// nenhum modelo. Serve para exercitar o auto-cadastro localmente; o modelo real (as ~30 perguntas)
    /// virá do editor (Thread D, D5) ou de um seed próprio, e substitui este.
    /// </summary>
    public static class DeclaracaoSaudeSeeder
    {
        public static async Task SeedExemploAsync(ClinicaDbContext context, bool isDevelopment, ILogger logger)
        {
            if (!isDevelopment) return;
            if (await context.ModelosDeclaracaoSaude.AnyAsync()) return;

            var modelo = new ModeloDeclaracaoSaude("Declaração de Saúde (exemplo)", modeloPadrao: true);
            context.ModelosDeclaracaoSaude.Add(modelo);

            string[] perguntas =
            {
                "Você possui alguma doença crônica (ex.: diabetes, hipertensão)?",
                "Faz uso contínuo de algum medicamento?",
                "Possui alguma alergia (medicamentos, alimentos)?"
            };
            for (int i = 0; i < perguntas.Length; i++)
                context.PerguntasDeclaracaoSaude.Add(new PerguntaDeclaracaoSaude(modelo.Id, perguntas[i], i + 1));

            await context.SaveChangesAsync();
            logger.LogInformation("Modelo de Declaração de Saúde de exemplo semeado (Development).");
        }
    }
}
