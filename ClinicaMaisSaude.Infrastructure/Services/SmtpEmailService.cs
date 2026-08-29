using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Envio de e-mail via SMTP (System.Net.Mail). Funciona com qualquer provedor SMTP
    /// (Brevo/SendGrid/Gmail etc.), configurado por EmailConfig:* (user-secrets/env).
    ///
    /// Fallback de desenvolvimento: se EmailConfig:Host não estiver configurado, o e-mail NÃO é
    /// enviado — o conteúdo (incluindo o código) é logado, permitindo testar o fluxo sem SMTP.
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmtpEmailService> _logger;

        /// <summary>
        /// Content-ID da logo embutida. O HTML dos e-mails referencia a imagem por
        /// &lt;img src="cid:logoclinica"&gt; — data URI/base64 é bloqueado por vários clientes
        /// (Gmail), então a logo vai como recurso inline (LinkedResource).
        /// </summary>
        public const string LogoContentId = "logoclinica";
        private static readonly string LogoPath =
            Path.Combine(AppContext.BaseDirectory, "EmailAssets", "logo_clinica_branca.png");

        public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task EnviarAsync(string destinatario, string assunto, string corpoHtml, string? corpoTexto = null)
        {
            var host = _configuration[ConfigKeys.EmailHost];

            if (string.IsNullOrWhiteSpace(host))
            {
                // Sem SMTP configurado: não falha o fluxo, apenas registra (dev/banca).
                _logger.LogWarning(
                    "[E-mail NÃO enviado — EmailConfig:Host ausente] Para: {Para} | Assunto: {Assunto}\n{Corpo}",
                    destinatario, assunto, corpoTexto ?? corpoHtml);
                return;
            }

            var port = int.TryParse(_configuration[ConfigKeys.EmailPort], out var p) ? p : 587;
            var user = _configuration[ConfigKeys.EmailUser];
            var senha = _configuration[ConfigKeys.EmailPassword];
            var from = _configuration[ConfigKeys.EmailFrom] ?? user ?? "no-reply@clinicamaissaude.com.br";
            var fromName = _configuration[ConfigKeys.EmailFromName] ?? "Clínica Mais Saúde";

            using var mensagem = new MailMessage
            {
                From = new MailAddress(from, fromName),
                Subject = assunto
            };
            mensagem.To.Add(destinatario);

            // Alternativa texto puro (multipart/alternative). Vai ANTES da HTML porque, na ordem
            // do multipart/alternative, o último é o preferido — o cliente mostra o HTML e usa o
            // texto no preview/notificação e como fallback.
            if (!string.IsNullOrWhiteSpace(corpoTexto))
            {
                var textoView = AlternateView.CreateAlternateViewFromString(corpoTexto, null, MediaTypeNames.Text.Plain);
                mensagem.AlternateViews.Add(textoView);
            }

            // HTML com a logo. Só embute o recurso inline (cid) quando o HTML realmente o
            // referencia — se o template usar uma URL pública (EmailConfig:LogoUrl), não há
            // embed nem anexo. Fallback: sem arquivo/URL, o alt text aparece.
            var htmlView = AlternateView.CreateAlternateViewFromString(corpoHtml, null, MediaTypeNames.Text.Html);
            if (corpoHtml.Contains("cid:" + LogoContentId, StringComparison.Ordinal) && File.Exists(LogoPath))
            {
                // Sem ContentType.Name / ContentDisposition: com um nome de arquivo, o Gmail
                // lista a imagem inline também como anexo. Só o ContentId a mantém apenas inline.
                var logo = new LinkedResource(new MemoryStream(File.ReadAllBytes(LogoPath)), MediaTypeNames.Image.Png)
                {
                    ContentId = LogoContentId,
                    TransferEncoding = TransferEncoding.Base64,
                };
                htmlView.LinkedResources.Add(logo);
            }
            mensagem.AlternateViews.Add(htmlView);

            using var cliente = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = string.IsNullOrWhiteSpace(user)
                    ? CredentialCache.DefaultNetworkCredentials
                    : new NetworkCredential(user, senha)
            };

            await cliente.SendMailAsync(mensagem);
        }
    }
}
