using System;

namespace ClinicaMaisSaude.Application.DTOs.Paciente
{
    public class PacienteResponse
    {
        public Guid Id { get; set; }
        public string Nome { get; set; }
        public string Cpf { get; set; }
        public string Telefone { get; set; }
        public string Email { get; set; }
        public Guid? UsuarioId { get; set; }
        public string Tipo { get; set; } = "Paciente";
        public bool TemProblemaMemoria { get; set; }
        public DateTime? UltimoAcesso { get; set; }
        public bool IsBanidoPermanente { get; set; }
        public string? FotoBase64 { get; set; }
    }
}