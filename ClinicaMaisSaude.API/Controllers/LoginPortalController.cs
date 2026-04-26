using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoginPortalController : ControllerBase
    {
        private readonly ClinicaDbContext _context;

        public LoginPortalController(ClinicaDbContext context)
        {
            _context = context;
        }

        [HttpPost("cadastro")]
        [Authorize(Roles = "Medico")] // Apenas Médicos acessam (regra extraída do JWT)
        public async Task<IActionResult> CadastroAdmin([FromBody] CadastroRequest request)
        {
            // Proteção em Camada Dupla: Verifica se o Médico é também um Administrador.
            var isAdminClaim = User.Claims.FirstOrDefault(c => c.Type == "IsAdmin")?.Value;
            if (isAdminClaim != "true")
            {
                return Forbid("Acesso Negado: Apenas Médicos Administradores podem realizar cadastros.");
            }

            // Sanitização do CPF
            var cpfLimpo = request.Cpf.Replace(".", "").Replace("-", "").Trim();
            if (cpfLimpo.Length != 11 || !IsCpfValido(cpfLimpo))
            {
                return BadRequest("O CPF informado não é matematicamente válido.");
            }

            if (_context.Usuarios.Any(u => u.Cpf == cpfLimpo || u.Email == request.Email))
            {
                return BadRequest("Já existe um usuário com este CPF ou E-mail.");
            }

            // Tratamento do CRM obrigatório para médicos
            if (request.TipoUsuario == "Medico")
            {
                if (string.IsNullOrWhiteSpace(request.Crm) || request.Crm.Length != 6 || !request.Crm.All(char.IsDigit))
                {
                    return BadRequest("Médicos devem possuir um CRM numérico válido de exatos 6 dígitos.");
                }
                if (string.IsNullOrWhiteSpace(request.UfCrm))
                {
                    return BadRequest("UF do CRM é obrigatória para médicos.");
                }
            }

            // Hash da senha usando BCrypt
            var senhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

            // Criação da Identidade (LoginPortal/Usuario)
            var novoUsuario = new Usuario(request.Email, cpfLimpo, senhaHash);
            _context.Usuarios.Add(novoUsuario);

            // Criação do Perfil associado
            if (request.TipoUsuario == "Paciente")
            {
                var paciente = new Paciente(request.Nome, cpfLimpo, "00000000000", request.Email);
                paciente.VincularUsuario(novoUsuario.Id);
                _context.Pacientes.Add(paciente);
            }
            else if (request.TipoUsuario == "Medico" || request.TipoUsuario == "Enfermeira")
            {
                var tipoDoc = request.TipoUsuario == "Medico" ? TipoProfissional.Medico : TipoProfissional.Enfermeira;
                var profissional = new Profissional(novoUsuario.Id, tipoDoc, request.Crm, request.UfCrm);
                _context.Profissionais.Add(profissional);
            }
            else
            {
                return BadRequest("Tipo de usuário inválido.");
            }

            await _context.SaveChangesAsync();
            return Ok(new { Mensagem = "Usuário cadastrado com sucesso!" });
        }

        // Algoritmo Verificador de CPF
        private bool IsCpfValido(string cpf)
        {
            int[] multiplicador1 = new int[9] { 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            int[] multiplicador2 = new int[10] { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            string tempCpf;
            string digito;
            int soma;
            int resto;
            
            if (cpf.Distinct().Count() == 1) return false;

            tempCpf = cpf.Substring(0, 9);
            soma = 0;

            for (int i = 0; i < 9; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador1[i];
            
            resto = soma % 11;
            if (resto < 2) resto = 0;
            else resto = 11 - resto;
            
            digito = resto.ToString();
            tempCpf = tempCpf + digito;
            soma = 0;
            for (int i = 0; i < 10; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador2[i];
            
            resto = soma % 11;
            if (resto < 2) resto = 0;
            else resto = 11 - resto;
            
            digito = digito + resto.ToString();
            return cpf.EndsWith(digito);
        }
    }
}
