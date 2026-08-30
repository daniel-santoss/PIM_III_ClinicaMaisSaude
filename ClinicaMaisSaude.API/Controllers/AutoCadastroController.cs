using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D) — endpoints ANÔNIMOS. O proponente busca a Declaração de
    /// Saúde vigente e envia o mini-cadastro + respostas. Anti-fraude: dedupe por CPF no serviço +
    /// rate-limit por IP (anti-flood generoso) só no POST; o backstop real é a avaliação presencial.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AutoCadastroController : ControllerBase
    {
        private readonly IAutoCadastroService _service;

        public AutoCadastroController(IAutoCadastroService service)
        {
            _service = service;
        }

        // Leitura pública do formulário (sem rate-limit: recarregar não deve punir).
        [HttpGet("declaracao")]
        public async Task<IActionResult> ObterDeclaracao()
        {
            var modelo = await _service.ObterDeclaracaoVigenteAsync();
            if (modelo == null)
                return NotFound("Nenhuma declaração de saúde configurada no momento.");
            return Ok(modelo);
        }

        [HttpPost("solicitar")]
        [EnableRateLimiting("autocadastro")]
        public async Task<IActionResult> Solicitar([FromBody] SolicitacaoCadastroRequest request)
        {
            var resultado = await _service.SolicitarAsync(request);
            if (!resultado.Sucesso)
                return BadRequest(resultado.Mensagem);
            return Ok(new { Mensagem = resultado.Mensagem });
        }
    }
}
