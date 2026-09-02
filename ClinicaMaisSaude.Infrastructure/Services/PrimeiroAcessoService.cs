using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Common;
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
    /// Primeiro acesso do auto-cadastro moderado (D4). Gêmea da recuperação de senha, reusando a mesma
    /// cripto (<see cref="CodigoVerificacaoCripto"/>): código de 6 chars como HMAC-SHA256+pepper, 15 min,
    /// uso único, máx. 5 tentativas, throttle de 60s; reset token de 256 bits (SHA-256) autoriza o passo
    /// final. Diferenças: (1) chaveado pela <see cref="Pessoa"/> (o proponente ainda não tem conta);
    /// (2) só é emitido para proponente APROVADO e SEM conta; (3) o desfecho CRIA o Usuario e ativa o
    /// Paciente (<see cref="Paciente.AtivarComConta"/>), em vez de trocar a senha. Confirmação no passo 2
    /// exige o CPF (vínculo de intenção). O presencial é o KYC real; segurança em paridade com a recuperação.
    /// </summary>
    public class PrimeiroAcessoService : IPrimeiroAcessoService
    {
        private readonly ClinicaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<PrimeiroAcessoService> _logger;

        private const int ExpiracaoCodigoMin = 15;
        private const int ExpiracaoResetMin = 10;
        private const int MaxTentativas = 5;
        private const int ThrottleSegundos = 60;
        private const int TamanhoMinimoSenha = 8;

        public PrimeiroAcessoService(ClinicaDbContext context, IConfiguration configuration, IEmailService emailService, ILogger<PrimeiroAcessoService> logger)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task SolicitarAsync(SolicitarPrimeiroAcessoRequest request)
        {
            var pessoa = await LocalizarPessoaAsync(request.Identificador);
            if (pessoa == null) return; // silencioso: o controller responde genérico

            // Elegibilidade: só proponente SEM conta e com solicitação APROVADA recebe código.
            var jaTemConta = await _context.Usuarios.AnyAsync(u => u.PessoaId == pessoa.Id);
            if (jaTemConta) return;

            var solicitacaoAprovada = await _context.SolicitacoesCadastro
                .Where(s => s.PessoaId == pessoa.Id && s.Status == StatusSolicitacao.Aprovada)
                .OrderByDescending(s => s.DtCriado)
                .FirstOrDefaultAsync();
            if (solicitacaoAprovada == null) return;

            var agora = DateTime.UtcNow;
            var codigosDaPessoa = await _context.CodigosVerificacao
                .Where(c => c.Tipo == TipoVerificacao.PrimeiroAcesso && c.PessoaId == pessoa.Id)
                .ToListAsync();

            // Throttle: se já foi emitido um código há menos de 60s, não reenvia (anti-spam).
            if (codigosDaPessoa.Any(c => !c.Usado && c.DtCriado > agora.AddSeconds(-ThrottleSegundos)))
                return;

            // Só um código válido por vez: invalida os anteriores ainda ativos.
            foreach (var anterior in codigosDaPessoa.Where(c => !c.Usado))
                anterior.MarcarUsado();

            // Housekeeping: remove códigos velhos já expirados há mais de 1 dia.
            var velhos = codigosDaPessoa.Where(c => c.DtExpiracao < agora.AddDays(-1)).ToList();
            if (velhos.Count > 0)
                _context.CodigosVerificacao.RemoveRange(velhos);

            var codigo = CodigoVerificacaoCripto.GerarCodigo();
            _context.CodigosVerificacao.Add(CodigoVerificacao.ParaPrimeiroAcesso(
                pessoa.Id, solicitacaoAprovada.Id, pessoa.Email,
                CodigoVerificacaoCripto.HashCodigoHex(codigo, Pepper()),
                agora.AddMinutes(ExpiracaoCodigoMin)));
            await _context.SaveChangesAsync();

            // Atalho de dev (só com a flag ligada): loga o código no console p/ testar sem e-mail.
            CodigoDevLog.Emitir(_configuration, _logger, TipoVerificacao.PrimeiroAcesso, pessoa.Email, codigo, ExpiracaoCodigoMin);

            var logoSrc = _configuration[ConfigKeys.EmailLogoUrl];
            if (string.IsNullOrWhiteSpace(logoSrc)) logoSrc = "cid:logoclinica";

            await _emailService.EnviarAsync(pessoa.Email, "Seu código de primeiro acesso",
                MontarCorpoEmail(pessoa.Nome, codigo, logoSrc),
                MontarCorpoTexto(pessoa.Nome, codigo));
        }

        public async Task<ValidarCodigoResponse> ConfirmarAsync(ConfirmarPrimeiroAcessoRequest request)
        {
            var generico = new ValidationException("Código inválido ou expirado.");

            var cpf = Cpf.Sanitizar(request.Cpf);
            if (string.IsNullOrWhiteSpace(cpf) || string.IsNullOrWhiteSpace(request.Codigo))
                throw generico;

            var pessoa = await _context.Pessoas.FirstOrDefaultAsync(p => p.Cpf == cpf);
            if (pessoa == null) throw generico;

            var agora = DateTime.UtcNow;
            var codigo = await _context.CodigosVerificacao
                .Where(c => c.Tipo == TipoVerificacao.PrimeiroAcesso && c.PessoaId == pessoa.Id && !c.Usado && c.DtExpiracao > agora)
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

        public async Task DefinirSenhaAsync(DefinirSenhaPrimeiroAcessoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ResetToken))
                throw new ValidationException("Token inválido ou expirado.");

            ValidarForcaSenha(request.NovaSenha);

            var agora = DateTime.UtcNow;
            var tokenHash = CodigoVerificacaoCripto.HashResetTokenHex(request.ResetToken);
            var codigo = await _context.CodigosVerificacao
                .Include(c => c.Pessoa)
                .FirstOrDefaultAsync(c => c.Tipo == TipoVerificacao.PrimeiroAcesso && c.ResetTokenHash == tokenHash && c.DtExpiracaoReset > agora);
            if (codigo == null) throw new ValidationException("Token inválido ou expirado.");

            // Corrida/reuso: se a conta já foi criada nesse meio tempo, aborta (idempotência defensiva).
            var jaTemConta = await _context.Usuarios.AnyAsync(u => u.PessoaId == codigo.PessoaId);
            if (jaTemConta)
            {
                _context.CodigosVerificacao.Remove(codigo);
                await _context.SaveChangesAsync();
                throw new ValidationException("Token inválido ou expirado.");
            }

            var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PessoaId == codigo.PessoaId);
            if (paciente == null) throw new ValidationException("Cadastro não encontrado.");

            // Cria a credencial e ativa o paciente (proponente → conta ativa).
            var usuario = new Usuario(codigo.PessoaId!.Value, BCrypt.Net.BCrypt.HashPassword(request.NovaSenha), RoleUsuario.Paciente);
            _context.Usuarios.Add(usuario);
            paciente.AtivarComConta(usuario.Id);

            // Reset token é de uso único: remove a linha para impedir reuso.
            _context.CodigosVerificacao.Remove(codigo);
            await _context.SaveChangesAsync();
        }

        // ----------------- Helpers -----------------

        // Aceita CPF ou e-mail (como a recuperação). Só retorna a Pessoa; a elegibilidade é checada fora.
        private async Task<Pessoa?> LocalizarPessoaAsync(string identificador)
        {
            if (string.IsNullOrWhiteSpace(identificador)) return null;
            var cpf = Cpf.Sanitizar(identificador);
            var email = identificador.Trim().ToLowerInvariant();
            return await _context.Pessoas.FirstOrDefaultAsync(p => p.Email == email || p.Cpf == cpf);
        }

        private string Pepper() =>
            _configuration[ConfigKeys.CodigoRecuperacaoPepper]
                ?? throw new InvalidOperationException($"{ConfigKeys.CodigoRecuperacaoPepper} não configurado.");

        private static void ValidarForcaSenha(string senha)
        {
            if (string.IsNullOrWhiteSpace(senha) || senha.Length < TamanhoMinimoSenha)
                throw new ValidationException($"A senha deve ter ao menos {TamanhoMinimoSenha} caracteres.");
        }

        private static string MontarCorpoEmail(string nome, string codigo, string logoSrc)
        {
            var primeiroNome = string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];
            var saudacao = string.IsNullOrEmpty(primeiroNome) ? "Olá" : $"Olá, {primeiroNome}";
            return $@"
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
            Seu cadastro foi aprovado! Use o código abaixo no aplicativo para concluir o primeiro acesso
            e definir a sua senha:
          </p>
          <div style=""font-size:34px;font-weight:bold;letter-spacing:10px;color:#2C5282;background:#EBF8FF;
                      border:1px solid #BEE3F8;border-radius:12px;padding:18px 12px;text-align:center;margin:0 0 22px"">
            {codigo}
          </div>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 6px"">
            O código expira em <strong style=""color:#0F172A"">{ExpiracaoCodigoMin} minutos</strong> e só pode ser usado uma vez.
          </p>
          <p style=""font-size:13px;color:#475569;line-height:20px;margin:0 0 24px"">
            Se você não solicitou o primeiro acesso, ignore este e-mail.
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

        private static string MontarCorpoTexto(string nome, string codigo)
        {
            var primeiroNome = string.IsNullOrWhiteSpace(nome) ? "" : nome.Trim().Split(' ')[0];
            var saudacao = string.IsNullOrEmpty(primeiroNome) ? "Olá" : $"Olá, {primeiroNome}";
            return
$@"CLÍNICA MAIS SAÚDE
Primeiro acesso

{saudacao}.

Seu cadastro foi aprovado! Use o código abaixo no aplicativo para concluir o
primeiro acesso e definir a sua senha:

    {codigo}

O código expira em {ExpiracaoCodigoMin} minutos e só pode ser usado uma vez.
Se você não solicitou o primeiro acesso, ignore este e-mail.

—
Clínica Mais Saúde • e-mail automático, não responda.";
        }
    }
}
