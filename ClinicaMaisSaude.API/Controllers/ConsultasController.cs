using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ConsultasController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public ConsultasController(IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public class SugerirTipoRequest
        {
            public string Sintomas { get; set; } = "";
        }

        [HttpPost("sugerir-tipo")]
        public async Task<IActionResult> SugerirTipo([FromBody] SugerirTipoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Sintomas) || request.Sintomas.Length < 10)
                return BadRequest("Descreva os sintomas com pelo menos 10 caracteres.");

            if (request.Sintomas.Length > 500)
                return BadRequest("Limite de 500 caracteres para a descrição dos sintomas.");

            var apiKey = _config["GeminiAI:ApiKey"];
            var model = _config["GeminiAI:Model"] ?? "gemini-2.5-flash";

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "SUA_CHAVE_AQUI")
                return StatusCode(503, "Serviço de IA não configurado. Contate o administrador.");

            var prompt = $@"Triagem médica. Sintomas do paciente: '{request.Sintomas}'
Retorne APENAS um JSON válido.
REGRA CRÍTICA 1: Se os sintomas forem vagos, muito curtos, confusos ou houver qualquer dúvida, a 'especialidade' DEVE ser OBRIGATORIAMENTE 'Clínica Geral'.
REGRA CRÍTICA 2: Seja extremamente direto na 'justificativa'. Você deve apenas informar o nome da especialidade.
Especialidades válidas: Clínica Geral, Medicina de Família, Pediatria, Ginecologia e Obstetrícia, Cardiologia, Dermatologia, Endocrinologia, Gastroenterologia, Neurologia, Ortopedia e Traumatologia, Psiquiatria, Otorrinolaringologia, Oftalmologia, Urologia, Pneumologia, Reumatologia, Geriatria, Medicina do Trabalho, Medicina Esportiva, Acupuntura, Análises Clínicas, Radiologia, Diagnóstico por Imagem.

Formato JSON exigido:
{{
  ""tipoProfissional"": ""Medico"" ou ""Enfermeira"",
  ""especialidade"": ""Nome exato da lista"",
  ""tipoConsulta"": ""Consulta Médica"", ""Triagem"", ""Exame"" ou ""Vacina"",
  ""tipo"": ""Consulta Médica"", ""Triagem"", ""Exame"" ou ""Vacina"",
  ""justificativa"": ""Nome da especialidade""
}}";

            try
            {
                var client = _httpClientFactory.CreateClient();
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                var body = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    },
                    generationConfig = new
                    {
                        temperature = 0.0,
                        maxOutputTokens = 1200,
                        responseMimeType = "application/json"
                    }
                };

                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        return StatusCode(429, "A triagem inteligente atingiu o limite de consultas gratuitas. Tente novamente mais tarde   .");
                    }
                    if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                    {
                        return StatusCode(503, "O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.");
                    }

                    return StatusCode(502, "Não foi possível conectar com a Inteligência Artificial no momento.");
                }

                Console.WriteLine("--- GEMINI RAW RESPONSE ---");
                Console.WriteLine(responseBody);
                Console.WriteLine("---------------------------");

                using var doc = JsonDocument.Parse(responseBody);
                var candidate = doc.RootElement.GetProperty("candidates")[0];

                // Validação segura de content e parts
                if (!candidate.TryGetProperty("content", out var contentElement) ||
                    !contentElement.TryGetProperty("parts", out var partsElement) ||
                    partsElement.GetArrayLength() == 0)
                {
                    var finishReason = candidate.TryGetProperty("finishReason", out var fr) ? fr.GetString() : "Desconhecido";
                    return StatusCode(502, $"A IA não retornou texto válido. Motivo: {finishReason}");
                }

                var textoResposta = partsElement[0]
                    .GetProperty("text")
                    .GetString();

                var serializeOptions = new JsonSerializerOptions { AllowTrailingCommas = true, ReadCommentHandling = JsonCommentHandling.Skip };
                return Ok(JsonSerializer.Deserialize<object>(textoResposta!, serializeOptions));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro inesperado ao processar IA: {ex.Message}");
                return StatusCode(502, "A IA não conseguiu analisar os sintomas corretamente ou a resposta foi bloqueada.");
            }
        }
    }
}
