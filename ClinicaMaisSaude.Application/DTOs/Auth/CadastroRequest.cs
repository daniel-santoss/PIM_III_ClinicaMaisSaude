using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Application.DTOs.Auth
{
    public class CadastroRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Senha { get; set; } = string.Empty;
        public string TipoUsuario { get; set; } = string.Empty; // Enfermeira | Medico | Paciente
        public string? UfCrm { get; set; }
        public string? Crm { get; set; }
    }
}
