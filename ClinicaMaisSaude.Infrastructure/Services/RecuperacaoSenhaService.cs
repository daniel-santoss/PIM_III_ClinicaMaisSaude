using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Autoatendimento de recuperação de senha por código de e-mail. Travas de segurança:
    /// código de 6 chars (RNG cripto, alfabeto sem ambíguos) guardado como HMAC-SHA256+pepper;
    /// expiração de 15 min; uso único; máx. 5 tentativas; throttle de 60s entre emissões;
    /// resposta sempre genérica (anti-enumeração). Ao validar, emite um reset token de 256 bits
    /// (guardado como SHA-256) que autoriza a troca da senha (BCrypt — só a senha usa BCrypt).
    /// </summary>
    public class RecuperacaoSenhaService : IRecuperacaoSenhaService
    {
        private readonly ClinicaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        private const int ExpiracaoCodigoMin = 15;
        private const int ExpiracaoResetMin = 10;
        private const int MaxTentativas = 5;
        private const int ThrottleSegundos = 60;
        private const int TamanhoMinimoSenha = 8;

        public RecuperacaoSenhaService(ClinicaDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task SolicitarAsync(SolicitarRecuperacaoRequest request)
        {
            var usuario = await LocalizarUsuarioAsync(request.Identificador);
            if (usuario == null) return; // silencioso: o controller responde genérico

            var agora = DateTime.UtcNow;

            var codigosDoUsuario = await _context.CodigosRecuperacaoSenha
                .Where(c => c.UsuarioId == usuario.Id)
                .ToListAsync();

            // Throttle: se já foi emitido um código há menos de 60s, não reenvia (anti-spam/anti-abuso).
            if (codigosDoUsuario.Any(c => !c.Usado && c.DtCriado > agora.AddSeconds(-ThrottleSegundos)))
                return;

            // Invalida qualquer código anterior ainda ativo (só um código válido por vez).
            foreach (var anterior in codigosDoUsuario.Where(c => !c.Usado))
                anterior.MarcarUsado();

            // Housekeeping: remove códigos velhos já expirados há mais de 1 dia.
            var velhos = codigosDoUsuario.Where(c => c.DtExpiracao < agora.AddDays(-1)).ToList();
            if (velhos.Count > 0)
                _context.CodigosRecuperacaoSenha.RemoveRange(velhos);

            var codigo = CodigoVerificacaoCripto.GerarCodigo();
            var entidade = new CodigoRecuperacaoSenha(
                usuario.Id, CodigoVerificacaoCripto.HashCodigoHex(codigo, Pepper()), agora.AddMinutes(ExpiracaoCodigoMin));
            _context.CodigosRecuperacaoSenha.Add(entidade);
            await _context.SaveChangesAsync();

            // Logo: URL pública se configurada (sem anexo); senão, cai na logo embutida (cid).
            var logoSrc = _configuration[ConfigKeys.EmailLogoUrl];
            if (string.IsNullOrWhiteSpace(logoSrc)) logoSrc = "cid:logoclinica";

            // Identidade (Thread B): destinatário e nome vêm da Pessoa (fonte única).
            await _emailService.EnviarAsync(usuario.Pessoa!.Email, "Código de recuperação de senha",
                MontarCorpoEmail(usuario.Pessoa!.Nome, codigo, logoSrc),
                MontarCorpoTexto(usuario.Pessoa!.Nome, codigo));
        }

        public async Task<ValidarCodigoResponse> ValidarCodigoAsync(ValidarCodigoRequest request)
        {
            var generico = new ValidationException("Código inválido ou expirado.");

            var usuario = await LocalizarUsuarioAsync(request.Identificador);
            if (usuario == null || string.IsNullOrWhiteSpace(request.Codigo)) throw generico;

            var agora = DateTime.UtcNow;
            var codigo = await _context.CodigosRecuperacaoSenha
                .Where(c => c.UsuarioId == usuario.Id && !c.Usado && c.DtExpiracao > agora)
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

            // Sucesso: consome o código e emite um reset token de alta entropia.
            codigo.MarcarUsado();
            var resetToken = CodigoVerificacaoCripto.GerarResetToken();
            codigo.DefinirResetToken(CodigoVerificacaoCripto.HashResetTokenHex(resetToken), agora.AddMinutes(ExpiracaoResetMin));
            await _context.SaveChangesAsync();

            return new ValidarCodigoResponse { ResetToken = resetToken };
        }

        public async Task RedefinirSenhaAsync(RedefinirSenhaRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ResetToken))
                throw new ValidationException("Token inválido ou expirado.");

            ValidarForcaSenha(request.NovaSenha);

            var agora = DateTime.UtcNow;
            var tokenHash = CodigoVerificacaoCripto.HashResetTokenHex(request.ResetToken);
            var codigo = await _context.CodigosRecuperacaoSenha
                .Include(c => c.Usuario)
                .FirstOrDefaultAsync(c => c.ResetTokenHash == tokenHash && c.DtExpiracaoReset > agora);
            if (codigo == null) throw new ValidationException("Token inválido ou expirado.");

            var usuario = codigo.Usuario;
            usuario.AlterarSenha(BCrypt.Net.BCrypt.HashPassword(request.NovaSenha));
            usuario.DesbloquearConta(); // troca de senha bem-sucedida zera o lockout de login

            // Reset token é de uso único: remove a linha para impedir reuso.
            _context.CodigosRecuperacaoSenha.Remove(codigo);
            await _context.SaveChangesAsync();
        }

        // ----------------- Helpers -----------------

        // Normalização espelha o login (AuthService): identificador pode ser CPF ou e-mail.
        private async Task<Usuario?> LocalizarUsuarioAsync(string identificador)
        {
            if (string.IsNullOrWhiteSpace(identificador)) return null;
            var cpf = identificador.Replace(".", "").Replace("-", "").Trim();
            var email = identificador.Trim().ToLowerInvariant();
            // Identidade (Thread B): busca pela Pessoa (fonte única); Include para ler nome/e-mail depois.
            return await _context.Usuarios
                .Include(u => u.Pessoa)
                .FirstOrDefaultAsync(u => u.Pessoa!.Email == email || u.Pessoa!.Cpf == cpf);
        }

        // Pepper (fora do banco) do HMAC do código — protege o segredo curto num vazamento do banco.
        private string Pepper() =>
            _configuration[ConfigKeys.CodigoRecuperacaoPepper]
                ?? throw new InvalidOperationException($"{ConfigKeys.CodigoRecuperacaoPepper} não configurado.");

        private static void ValidarForcaSenha(string senha)
        {
            if (string.IsNullOrWhiteSpace(senha) || senha.Length < TamanhoMinimoSenha)
                throw new ValidationException($"A senha deve ter ao menos {TamanhoMinimoSenha} caracteres.");
        }

        // Layout à prova de clientes de e-mail (tabelas + estilos inline), na identidade navy do
        // site. A logo vai inline via Content-ID (cid:logoclinica) — precisa casar com
        // SmtpEmailService.LogoContentId; se o arquivo não existir, o alt text aparece no lugar.
        private static string MontarCorpoEmail(string nome, string codigo, string logoSrc)
        {
            var primeiroNome = string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];
            var saudacao = string.IsNullOrEmpty(primeiroNome) ? "Olá" : $"Olá, {primeiroNome}";
            return $@"
<div style=""display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0"">
  Recebemos um pedido para redefinir a senha da sua conta. Abra para ver seu código de verificação.
  &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>
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
          <p style=""font-size:16px;font-weight:bold;margin:0 0 6px"">{saudacao}.</p>
          <p style=""font-size:14px;color:#475569;line-height:21px;margin:0 0 22px"">
            Recebemos um pedido para redefinir a senha da sua conta. Use o código abaixo para continuar:
          </p>
          <div style=""font-size:34px;font-weight:bold;letter-spacing:10px;color:#2C5282;background:#EBF8FF;
                      border:1px solid #BEE3F8;border-radius:12px;padding:18px 12px;text-align:center;margin:0 0 22px"">
            {codigo}
          </div>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
            O código expira em <strong style=""color:#0F172A"">{ExpiracaoCodigoMin} minutos</strong> e só pode ser usado uma vez.
          </p>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 24px"">
            Se você não solicitou a recuperação, ignore este e-mail — sua senha continua a mesma.
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
        }

        // Versão texto puro (com quebras de linha) — usada no preview de notificações e como
        // fallback em clientes sem HTML. Evita o texto "tudo junto" gerado ao esconder as tags.
        private static string MontarCorpoTexto(string nome, string codigo)
        {
            var primeiroNome = string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];
            var saudacao = string.IsNullOrEmpty(primeiroNome) ? "Olá" : $"Olá, {primeiroNome}";
            return
$@"CLÍNICA MAIS SAÚDE
Recuperação de senha

{saudacao}.

Recebemos um pedido para redefinir a senha da sua conta.
Seu código de verificação é:

    {codigo}

O código expira em {ExpiracaoCodigoMin} minutos e só pode ser usado uma vez.
Se você não solicitou a recuperação, ignore este e-mail — sua senha continua a mesma.

—
Clínica Mais Saúde • e-mail automático, não responda.";
        }
    }
}
