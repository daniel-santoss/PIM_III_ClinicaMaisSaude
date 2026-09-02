using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Verificação de posse do e-mail no auto-cadastro (wizard web). Mesma cripto e travas dos demais
    /// fluxos de código (<see cref="CodigoVerificacaoCripto"/>): código de 6 chars como HMAC-SHA256+pepper,
    /// 15 min, uso único, máx. 5 tentativas, throttle de 60s por e-mail. A diferença é que aqui não há
    /// identidade ainda — o código é chaveado só pelo e-mail. Ao confirmar, emite-se um token de e-mail
    /// verificado (validade maior, para dar tempo de preencher a Declaração de Saúde) que o envio final
    /// da solicitação exige, amarrando o e-mail. Guarda contra spam: throttle por e-mail + rate-limit por IP.
    /// </summary>
    public class VerificacaoEmailService : IVerificacaoEmailService
    {
        private readonly ClinicaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<VerificacaoEmailService> _logger;

        private const int ExpiracaoCodigoMin = 15;
        // Token de e-mail verificado: mais folgado que o código, para cobrir o preenchimento da DS.
        private const int ExpiracaoTokenMin = 30;
        private const int MaxTentativas = 5;
        private const int ThrottleSegundos = 60;

        public VerificacaoEmailService(ClinicaDbContext context, IConfiguration configuration, IEmailService emailService, ILogger<VerificacaoEmailService> logger)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task SolicitarAsync(SolicitarVerificacaoEmailRequest request)
        {
            var email = NormalizarEmail(request.Email);
            if (!EmailValido(email))
                throw new ValidationException("Informe um e-mail válido.");

            var agora = DateTime.UtcNow;
            var codigosDoEmail = await _context.CodigosVerificacao
                .Where(c => c.Tipo == TipoVerificacao.VerificacaoEmail && c.Email == email)
                .ToListAsync();

            // Throttle: um código a cada 60s por e-mail (anti-spam/anti-bombing).
            if (codigosDoEmail.Any(c => !c.Usado && c.DtCriado > agora.AddSeconds(-ThrottleSegundos)))
                return;

            // Só um código válido por vez: invalida os anteriores ainda ativos.
            foreach (var anterior in codigosDoEmail.Where(c => !c.Usado))
                anterior.MarcarUsado();

            // Housekeeping: remove códigos velhos já expirados há mais de 1 dia.
            var velhos = codigosDoEmail.Where(c => c.DtExpiracao < agora.AddDays(-1)).ToList();
            if (velhos.Count > 0)
                _context.CodigosVerificacao.RemoveRange(velhos);

            var codigo = CodigoVerificacaoCripto.GerarCodigo();
            _context.CodigosVerificacao.Add(CodigoVerificacao.ParaVerificacaoEmail(
                email, CodigoVerificacaoCripto.HashCodigoHex(codigo, Pepper()), agora.AddMinutes(ExpiracaoCodigoMin)));
            await _context.SaveChangesAsync();

            // Atalho de dev (só com a flag ligada): loga o código no console p/ testar sem e-mail.
            CodigoDevLog.Emitir(_configuration, _logger, TipoVerificacao.VerificacaoEmail, email, codigo, ExpiracaoCodigoMin);

            var logoSrc = _configuration[ConfigKeys.EmailLogoUrl];
            if (string.IsNullOrWhiteSpace(logoSrc)) logoSrc = "cid:logoclinica";

            await _emailService.EnviarAsync(email, "Confirme seu e-mail — Clínica Mais Saúde",
                MontarCorpoEmail(codigo, logoSrc), MontarCorpoTexto(codigo));
        }

        public async Task<VerificacaoEmailTokenResponse> ConfirmarAsync(ConfirmarVerificacaoEmailRequest request)
        {
            var generico = new ValidationException("Código inválido ou expirado.");

            var email = NormalizarEmail(request.Email);
            if (!EmailValido(email) || string.IsNullOrWhiteSpace(request.Codigo))
                throw generico;

            var agora = DateTime.UtcNow;
            var codigo = await _context.CodigosVerificacao
                .Where(c => c.Tipo == TipoVerificacao.VerificacaoEmail && c.Email == email && !c.Usado && c.DtExpiracao > agora)
                .OrderByDescending(c => c.DtCriado)
                .FirstOrDefaultAsync();
            if (codigo == null) throw generico;

            if (codigo.Tentativas >= MaxTentativas)
            {
                codigo.MarcarUsado();
                await _context.SaveChangesAsync();
                throw generico;
            }

            var candidato = CodigoVerificacaoCripto.HashCodigoBytes(request.Codigo, Pepper());
            var armazenado = Convert.FromHexString(codigo.CodigoHash);
            if (!CryptographicOperations.FixedTimeEquals(candidato, armazenado))
            {
                codigo.RegistrarTentativa();
                if (codigo.Tentativas >= MaxTentativas) codigo.MarcarUsado();
                await _context.SaveChangesAsync();
                throw generico;
            }

            // Sucesso: consome o código e emite o token de e-mail verificado.
            codigo.MarcarUsado();
            var token = CodigoVerificacaoCripto.GerarResetToken();
            codigo.DefinirResetToken(CodigoVerificacaoCripto.HashResetTokenHex(token), agora.AddMinutes(ExpiracaoTokenMin));
            await _context.SaveChangesAsync();

            return new VerificacaoEmailTokenResponse { Token = token };
        }

        // ----------------- Helpers -----------------

        private static string NormalizarEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

        // Checagem mínima (espelha o AutoCadastroService): presença de @ com partes não vazias.
        private static bool EmailValido(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            var partes = email.Split('@');
            return partes.Length == 2 && partes[0].Length > 0 && partes[1].Contains('.');
        }

        private string Pepper() =>
            _configuration[ConfigKeys.CodigoRecuperacaoPepper]
                ?? throw new InvalidOperationException($"{ConfigKeys.CodigoRecuperacaoPepper} não configurado.");

        private static string MontarCorpoEmail(string codigo, string logoSrc) => $@"
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
          <p style=""font-size:16px;font-weight:bold;margin:0 0 6px"">Confirme seu e-mail</p>
          <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 22px"">
            Estamos criando o seu cadastro na Clínica Mais Saúde. Use o código abaixo para confirmar
            que este e-mail é seu e continuar o cadastro:
          </p>
          <div style=""font-size:34px;font-weight:bold;letter-spacing:10px;color:#2C5282;background:#EBF8FF;
                      border:1px solid #BEE3F8;border-radius:12px;padding:18px 12px;text-align:center;margin:0 0 22px"">
            {codigo}
          </div>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
            O código expira em <strong style=""color:#0F172A"">{ExpiracaoCodigoMin} minutos</strong> e só pode ser usado uma vez.
          </p>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 24px"">
            Se você não iniciou um cadastro, ignore este e-mail.
          </p>
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

        private static string MontarCorpoTexto(string codigo) =>
$@"CLÍNICA MAIS SAÚDE
Confirmação de e-mail

Estamos criando o seu cadastro na Clínica Mais Saúde.
Seu código de confirmação é:

    {codigo}

O código expira em {ExpiracaoCodigoMin} minutos e só pode ser usado uma vez.
Se você não iniciou um cadastro, ignore este e-mail.

—
Clínica Mais Saúde • e-mail automático, não responda.";
    }
}
