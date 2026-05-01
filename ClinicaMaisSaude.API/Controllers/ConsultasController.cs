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

            var prompt = $@"Você é um assistente de triagem médica de uma clínica.
Com base nos sintomas descritos pelo paciente, sugira:
1. O tipo de profissional mais adequado (Médico ou Enfermeira)
2. A especialidade médica mais indicada (se for médico)
3. O tipo de consulta recomendado

Responda APENAS em JSON neste formato exato, sem markdown:
{{""tipoProfissional"": ""Medico"" ou ""Enfermeira"", ""especialidade"": ""nome da especialidade"", ""tipoConsulta"": ""Triagem"" ou ""Exame"" ou ""Vacina"" ou ""Consulta Médica"", ""justificativa"": ""breve explicação""}}

Especialidades disponíveis: Clínica Geral, Medicina de Família, Pediatria, Ginecologia e Obstetrícia, Cardiologia, Dermatologia, Endocrinologia, Gastroenterologia, Neurologia, Ortopedia e Traumatologia, Psiquiatria, Otorrinolaringologia, Oftalmologia, Urologia, Pneumologia, Reumatologia, Geriatria.

Sintomas do paciente: {request.Sintomas}";

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
                        temperature = 0.3,
                        maxOutputTokens = 300
                    }
                };

                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return StatusCode(502, $"Erro ao consultar serviço de IA. Status: {response.StatusCode}, Detalhes: {responseBody}");

                Console.WriteLine("--- GEMINI RAW RESPONSE ---");
                Console.WriteLine(responseBody);
                Console.WriteLine("---------------------------");

                // Extrai o texto da resposta do Gemini
                using var doc = JsonDocument.Parse(responseBody);
                var textoResposta = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                // Limpa possíveis marcações markdown e extrai apenas o bloco JSON
                var textoLimpo = textoResposta ?? "";
                var startIndex = textoLimpo.IndexOf('{');
                var endIndex = textoLimpo.LastIndexOf('}');
                
                if (startIndex != -1 && endIndex != -1 && endIndex > startIndex)
                {
                    textoLimpo = textoLimpo.Substring(startIndex, endIndex - startIndex + 1);
                }
                else
                {
                    throw new JsonException("A resposta não continha um objeto JSON válido.");
                }

                Console.WriteLine("--- GEMINI CLEANED TEXT ---");
                Console.WriteLine(textoLimpo);
                Console.WriteLine("---------------------------");

                // Valida se é JSON válido com mais tolerância
                var options = new JsonDocumentOptions { AllowTrailingCommas = true };
                using var parsed = JsonDocument.Parse(textoLimpo!, options);
                
                var serializeOptions = new JsonSerializerOptions { AllowTrailingCommas = true, ReadCommentHandling = JsonCommentHandling.Skip };
                return Ok(JsonSerializer.Deserialize<object>(textoLimpo!, serializeOptions));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro inesperado ao processar IA: {ex.Message}");
                return StatusCode(502, "A IA não conseguiu analisar os sintomas corretamente ou a resposta foi bloqueada.");
            }
        }
    }
}
