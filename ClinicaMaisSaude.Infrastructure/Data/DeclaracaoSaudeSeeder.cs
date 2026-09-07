using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    /// <summary>
    /// Semeia o modelo OFICIAL de Declaração de Saúde (as 30 perguntas) como modelo vigente, apenas se
    /// ainda não houver nenhum modelo. É dado de referência que o auto-cadastro precisa para funcionar,
    /// por isso roda em qualquer ambiente (idempotente: não recria se já existe um modelo). O admin pode
    /// editar/versionar depois pelo editor (Thread D — D5); trocar a DS = criar novo modelo e torná-lo vigente.
    /// </summary>
    public static class DeclaracaoSaudeSeeder
    {
        // As 30 perguntas oficiais da DS, na ordem. Fonte da versão vigente para bancos novos/CI/PIM IV.
        private static readonly string[] Perguntas =
        {
            "Possui alguma doença ou condição de saúde atualmente?",
            "Possui alguma doença crônica?",
            "Está realizando algum tratamento médico atualmente?",
            "Faz acompanhamento médico regular?",
            "Faz uso contínuo de algum medicamento?",
            "Faz uso de vitaminas, suplementos ou fitoterápicos regularmente?",
            "Possui alguma alergia conhecida?",
            "Já apresentou reação alérgica a algum medicamento?",
            "Possui alguma alergia ou intolerância alimentar?",
            "Já foi internado(a) por algum motivo de saúde?",
            "Já passou por algum procedimento cirúrgico?",
            "Já realizou algum procedimento médico ou odontológico relevante recentemente?",
            "Possui ou já possuiu problemas cardíacos?",
            "Possui ou já possuiu pressão arterial elevada (hipertensão)?",
            "Possui ou já possuiu diabetes?",
            "Possui ou já possuiu alterações no colesterol ou triglicerídeos?",
            "Possui ou já possuiu problemas respiratórios?",
            "Possui ou já possuiu problemas gastrointestinais?",
            "Possui ou já possuiu problemas renais ou urinários?",
            "Possui ou já possuiu problemas no fígado?",
            "Possui ou já possuiu problemas na tireoide?",
            "Possui ou já possuiu alguma alteração hormonal ou metabólica?",
            "Possui ou já possuiu problemas neurológicos?",
            "Possui ou já possuiu problemas musculares, articulares ou ósseos?",
            "Possui alguma limitação física ou dificuldade para realizar atividades do dia a dia?",
            "Já sofreu algum acidente ou trauma que tenha deixado sequelas ou limitações?",
            "Está realizando acompanhamento psicológico ou psiquiátrico?",
            "Possui alguma condição de saúde que exija cuidados ou atenção especial durante o atendimento?",
            "Está aguardando algum exame, diagnóstico, procedimento ou resultado médico?",
            "Existe alguma outra informação relacionada à sua saúde que você considera importante informar à clínica?",
        };

        public static async Task SeedAsync(ClinicaDbContext context, ILogger logger)
        {
            if (await context.ModelosDeclaracaoSaude.AnyAsync()) return;

            var modelo = new ModeloDeclaracaoSaude("Declaração de Saúde", modeloPadrao: true);
            context.ModelosDeclaracaoSaude.Add(modelo);

            for (int i = 0; i < Perguntas.Length; i++)
                context.PerguntasDeclaracaoSaude.Add(new PerguntaDeclaracaoSaude(modelo.Id, Perguntas[i], i + 1));

            await context.SaveChangesAsync();
            logger.LogInformation("Modelo de Declaração de Saúde vigente semeado ({Qtd} perguntas).", Perguntas.Length);
        }
    }
}
