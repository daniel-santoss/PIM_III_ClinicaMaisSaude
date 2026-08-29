using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IRecuperacaoSenhaService _recuperacaoService;

        public AuthController(IAuthService authService, IRecuperacaoSenhaService recuperacaoService)
        {
            _authService = authService;
            _recuperacaoService = recuperacaoService;
        }

        [HttpPost("login")]
        [EnableRateLimiting("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Identificador) || string.IsNullOrWhiteSpace(request.Senha))
                throw new ValidationException("O identificador e a senha são obrigatórios.");

            var response = await _authService.AutenticarAsync(request);
            return Ok(response);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var response = await _authService.RefreshTokenAsync(request);
            return Ok(response);
        }

        // ---------------- Recuperação de senha (autoatendimento) ----------------
        // Anônimos + rate limit por IP. A resposta de "solicitar" é sempre genérica
        // (não revela se a conta existe); "validar"/"redefinir" lançam mensagem genérica.

        [HttpPost("recuperar-senha/solicitar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> SolicitarRecuperacao([FromBody] SolicitarRecuperacaoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Identificador))
                throw new ValidationException("Informe o CPF ou e-mail.");

            await _recuperacaoService.SolicitarAsync(request);
            return Ok(new MensagemResponse
            {
                Mensagem = "Se a conta existir, enviamos um código para o e-mail cadastrado."
            });
        }

        [HttpPost("recuperar-senha/validar")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> ValidarCodigo([FromBody] ValidarCodigoRequest request)
        {
            var response = await _recuperacaoService.ValidarCodigoAsync(request);
            return Ok(response);
        }

        [HttpPost("recuperar-senha/redefinir")]
        [EnableRateLimiting("recuperacao")]
        public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaRequest request)
        {
            await _recuperacaoService.RedefinirSenhaAsync(request);
            return Ok(new MensagemResponse { Mensagem = "Senha redefinida com sucesso." });
        }
    }
}
