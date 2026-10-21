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
using ClinicaMaisSaude.Infrastructure.Email;
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

            var logoSrc = EmailTemplates.LogoSrc(_configuration);
            await _emailService.EnviarAsync(email, "Confirme seu e-mail — Clínica Mais Saúde",
                EmailTemplates.CodigoHtml(logoSrc,
                    titulo: "Confirme seu e-mail",
                    intro: "Estamos criando o seu cadastro na Clínica Mais Saúde. Use o código abaixo para confirmar que este e-mail é seu e continuar o cadastro:",
                    codigo: codigo, expiracaoMin: ExpiracaoCodigoMin,
                    nota: "Se você não iniciou um cadastro, ignore este e-mail."),
                EmailTemplates.Texto("Confirmação de e-mail",
$@"Estamos criando o seu cadastro na Clínica Mais Saúde.
Seu código de confirmação é:

    {codigo}

O código expira em {ExpiracaoCodigoMin} minutos e só pode ser usado uma vez.
Se você não iniciou um cadastro, ignore este e-mail."));
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

    }
}
