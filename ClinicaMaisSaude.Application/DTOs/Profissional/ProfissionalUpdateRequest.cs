namespace ClinicaMaisSaude.Application.DTOs.Profissional
{
    // Edição cadastral do profissional pela tela de usuários. A identidade
    // (Nome/Email/Telefone) vive na Pessoa (fonte única); o CPF é inalterável.
    public class ProfissionalUpdateRequest
    {
        public string? Nome { get; set; }
        public string? Telefone { get; set; }
        public string? Email { get; set; }
        /// <summary>Novo primeiro plantão (redefine a escala 12x36 a partir desse dia); nulo mantém o atual.</summary>
        public DateTime? InicioPlantoes { get; set; }
    }
}
