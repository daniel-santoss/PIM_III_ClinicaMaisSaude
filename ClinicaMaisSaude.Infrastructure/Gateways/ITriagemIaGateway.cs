using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Gateways
{
    /// <summary>
    /// Desfecho da classificação de sintomas pela IA de triagem.
    /// </summary>
    public enum ResultadoTriagem
    {
        /// <summary>A IA devolveu um JSON de triagem utilizável (em <see cref="TriagemIaResposta.TextoJson"/>).</summary>
        Sucesso,

        /// <summary>
        /// A IA recusou por segurança (finishReason=SAFETY) OU detectou tentativa de injeção de prompt.
        /// O chamador deve aplicar a punição — o gateway não decide política, apenas classifica.
        /// </summary>
        BloqueadoPorSeguranca
    }

    /// <summary>Resposta normalizada da IA de triagem, independente do provedor.</summary>
    public sealed record TriagemIaResposta(ResultadoTriagem Tipo, string? TextoJson);

    /// <summary>
    /// Fronteira externa da triagem por IA. Isola o provedor concreto (hoje Google Gemini) do
    /// <c>ConsultaService</c>: aqui a abstração SE PAGA — permite testar a moderação/banimento sem
    /// rede e trocar de provedor sem tocar na regra de negócio. Erros de conectividade/limite são
    /// sinalizados por exceções tipadas da Application (ServiceUnavailable/RateLimitExceeded).
    /// </summary>
    public interface ITriagemIaGateway
    {
        Task<TriagemIaResposta> ClassificarSintomasAsync(string sintomas);
    }
}
