using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Abstração de envio de e-mail transacional. Hoje há um único implementador (SMTP);
    /// serve a recuperação de senha e pode ser reaproveitada por outros fluxos.
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Envia um e-mail. Se <paramref name="corpoTexto"/> for informado, ele vai como
        /// alternativa text/plain (multipart/alternative) — melhora o preview em notificações
        /// e serve de fallback para clientes sem HTML.
        /// </summary>
        Task EnviarAsync(string destinatario, string assunto, string corpoHtml, string? corpoTexto = null);
    }
}
