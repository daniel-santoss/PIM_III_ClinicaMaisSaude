using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Identificador) || string.IsNullOrWhiteSpace(request.Senha))
            {
                return BadRequest("O identificador e a senha são obrigatórios.");
            }

            try
            {
                var response = await _authService.AutenticarAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                // Tratando erro de login mal sucedido
                return Unauthorized(new { message = ex.Message });
            }
        }
    }
}
