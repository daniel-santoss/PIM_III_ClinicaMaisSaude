using ClinicaMaisSaude.Domain.Constants;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Email
{
    /// <summary>
    /// Formatador central dos e-mails transacionais (identidade navy). Concentra a moldura
    /// compartilhada (cabeçalho com logo + rodapé) e os dois formatos de corpo — "código" e
    /// "prosa" — para que os serviços de negócio não carreguem HTML. Classe concreta, sem
    /// interface (abstração com parcimônia): é só formatação de string, sem fronteira externa.
    /// </summary>
    internal static class EmailTemplates
    {
        /// <summary>Origem da logo: URL pública (sem anexo) se configurada; senão a logo embutida (cid).</summary>
        public static string LogoSrc(IConfiguration config)
        {
            var logo = config[ConfigKeys.EmailLogoUrl];
            return string.IsNullOrWhiteSpace(logo) ? "cid:logoclinica" : logo;
        }

        /// <summary>"Olá, &lt;primeiro nome&gt;" ou "Olá" quando o nome está vazio.</summary>
        public static string Saudacao(string nome)
        {
            var primeiroNome = string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];
            return string.IsNullOrEmpty(primeiroNome) ? "Olá" : $"Olá, {primeiroNome}";
        }

        /// <summary>
        /// E-mail com destaque de código (recuperação de senha, verificação de e-mail, primeiro
        /// acesso): linha-título em negrito + intro + caixa do código + validade + nota.
        /// <paramref name="preheader"/> é o texto oculto de pré-visualização (opcional).
        /// </summary>
        public static string CodigoHtml(string logoSrc, string titulo, string intro, string codigo, int expiracaoMin, string nota, string? preheader = null) =>
            Layout(logoSrc, $@"
          <p style=""font-size:16px;font-weight:bold;margin:0 0 6px"">{titulo}</p>
          <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 22px"">
            {intro}
          </p>
          <div style=""font-size:34px;font-weight:bold;letter-spacing:10px;color:#2C5282;background:#EBF8FF;
                      border:1px solid #BEE3F8;border-radius:12px;padding:18px 12px;text-align:center;margin:0 0 22px"">
            {codigo}
          </div>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
            O código expira em <strong style=""color:#0F172A"">{expiracaoMin} minutos</strong> e só pode ser usado uma vez.
          </p>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 24px"">
            {nota}
          </p>", preheader);

        /// <summary>E-mail em prosa (auto-cadastro): saudação em negrito + miolo HTML livre.</summary>
        public static string ProsaHtml(string logoSrc, string saudacao, string miolo) =>
            Layout(logoSrc, $@"
          <p style=""font-size:16px;font-weight:bold;margin:0 0 12px"">{saudacao}.</p>
          {miolo}");

        /// <summary>Versão text/plain padrão: cabeçalho + corpo (livre) + rodapé.</summary>
        public static string Texto(string titulo, string corpo) =>
$@"CLÍNICA MAIS SAÚDE
{titulo}

{corpo}

—
Clínica Mais Saúde • e-mail automático, não responda.";

        // Moldura navy compartilhada por todos os e-mails (cabeçalho com logo + corpo + rodapé).
        private static string Layout(string logoSrc, string corpoInterno, string? preheader = null)
        {
            var preheaderHtml = string.IsNullOrEmpty(preheader) ? "" : $@"
<div style=""display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0"">
  {preheader}
  &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>";

            return $@"{preheaderHtml}
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""
       style=""background:#F1F5F9;margin:0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"">
  <tr><td align=""center"">
    <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0""
           style=""width:480px;max-width:100%;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden"">
      <tr>
        <td align=""center"" style=""background:#2C5282;padding:16px 24px"">
          <img src=""{logoSrc}"" alt=""Clínica Mais Saúde"" width=""44""
               style=""display:block;width:44px;height:auto;margin:0 auto 4px;border:0"" />
          <div style=""color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.3px"">Clínica Mais Saúde</div>
        </td>
      </tr>
      <tr>
        <td style=""padding:30px 32px 8px;color:#0F172A"">
          {corpoInterno}
        </td>
      </tr>
      <tr>
        <td style=""background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px"">
          <p style=""font-size:11px;color:#94A3B8;text-align:center;margin:0;line-height:16px"">
            Este é um e-mail automático da Clínica Mais Saúde. Por favor, não responda.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>";
        }
    }
}
