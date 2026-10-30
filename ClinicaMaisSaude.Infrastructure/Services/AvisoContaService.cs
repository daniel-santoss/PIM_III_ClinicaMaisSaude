using System;
using System.Net;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Infrastructure.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class AvisoContaService : IAvisoContaService
    {
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AvisoContaService> _logger;

        public AvisoContaService(IEmailService emailService, IConfiguration configuration, ILogger<AvisoContaService> logger)
        {
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task AvisarTrocaDeEmailAsync(string nome, string emailAntigo, string emailNovo)
        {
            const string assunto = "O e-mail da sua conta foi alterado";
            var html = CorpoTrocaDeEmail(nome, emailAntigo, emailNovo);
            var texto = TextoTrocaDeEmail(nome, emailAntigo, emailNovo);

            foreach (var destino in new[] { emailAntigo, emailNovo })
            {
                try
                {
                    await _emailService.EnviarAsync(destino, assunto, html, texto);
                }
                catch (Exception ex)
                {
                    // A troca já foi gravada; o aviso é complementar e não pode desfazê-la.
                    _logger.LogWarning(ex, "Falha ao enviar o aviso de troca de e-mail para {Destino}.", destino);
                }
            }
        }

        private string CorpoTrocaDeEmail(string nome, string antigo, string novo) => EmailTemplates.ProsaHtml(EmailTemplates.LogoSrc(_configuration), EmailTemplates.Saudacao(nome), $@"
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              O e-mail da sua conta na <strong style=""color:#0F172A"">Clínica Mais Saúde</strong> foi alterado
              de <strong style=""color:#0F172A"">{WebUtility.HtmlEncode(antigo)}</strong>
              para <strong style=""color:#2C5282"">{WebUtility.HtmlEncode(novo)}</strong>.
            </p>
            <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 18px"">
              A partir de agora, os avisos e a recuperação de senha vão para o novo endereço. O login
              continua funcionando também com o seu CPF.
            </p>
            <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
              Se você não pediu essa alteração, procure a recepção da clínica.
            </p>");

        private static string TextoTrocaDeEmail(string nome, string antigo, string novo) =>
            EmailTemplates.Texto("E-mail da conta alterado",
$@"{EmailTemplates.Saudacao(nome)}.

O e-mail da sua conta foi alterado de {antigo} para {novo}.
A partir de agora, os avisos e a recuperação de senha vão para o novo endereço.
O login continua funcionando também com o seu CPF.

Se você não pediu essa alteração, procure a recepção da clínica.");
    }
}
