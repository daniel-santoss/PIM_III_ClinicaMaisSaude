using System;

namespace ClinicaMaisSaude.Application.DTOs.Auth
{
    public class LoginRequest
    {
        public string Identificador { get; set; } = string.Empty; // Pode ser Email ou CPF
        public string Senha { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public Guid UsuarioId { get; set; }
        public string TipoUsuario { get; set; } = string.Empty;
        public Guid? PacienteId { get; set; }
        public bool IsAdmin { get; set; }
    }
}
