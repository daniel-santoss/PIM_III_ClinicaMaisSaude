using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Gateways
{
    /// <summary>
    /// Desfecho da classificação de sintomas pela IA de triagem. Distingue DELIBERADAMENTE dois casos
    /// que não podem ser confundidos: a IA acusar injeção (sinal confiável → punir) e o provedor
    /// recusar processar o conteúdo (ambíguo → acolher, nunca punir).
    /// </summary>
    public enum ResultadoTriagem
    {
        /// <summary>A IA devolveu um JSON de triagem utilizável (em <see cref="TriagemIaResposta.TextoJson"/>).</summary>
        Sucesso,

        /// <summary>
        /// A IA PROCESSOU o texto e o classificou como tentativa de injeção/extração de credenciais,
        /// devolvendo o marcador da REGRA CRÍTICA 2. Sinal confiável e intencional: o chamador pune.
        /// </summary>
        InjecaoDetectada,

        /// <summary>
        /// O provedor RECUSOU processar (filtro de conteúdo: finishReason=SAFETY, promptFeedback.blockReason
        /// ou resposta sem candidato utilizável). É ambíguo — numa triagem médica, muito mais provável ser
        /// sofrimento real (ex.: automutilação) do que ataque. O chamador NÃO pune: acolhe e orienta.
        /// </summary>
        RecusadoPorSeguranca
    }

    /// <summary>Resposta normalizada da IA de triagem, independente do provedor.</summary>
    public sealed record TriagemIaResposta(ResultadoTriagem Tipo, string? TextoJson);

    /// <summary>
    /// Fronteira externa da triagem por IA. Isola o provedor concreto (hoje Google Gemini) do
    /// <c>ConsultaService</c>: aqui a abstração SE PAGA — permite testar a moderação/banimento sem
    /// rede e trocar de provedor sem tocar na regra de negócio. Erros de conectividade/limite/parse
    /// são sinalizados por exceções tipadas da Application (ServiceUnavailable/RateLimitExceeded);
    /// os desfechos de classificação vêm no <see cref="ResultadoTriagem"/>, nunca como 500.
    /// </summary>
    public interface ITriagemIaGateway
    {
        Task<TriagemIaResposta> ClassificarSintomasAsync(string sintomas);
    }
}
