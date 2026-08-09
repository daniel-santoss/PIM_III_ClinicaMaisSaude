namespace ClinicaMaisSaude.Application.DTOs.Perfil
{
    // Confirmação de exclusão de conta pelo próprio paciente. Exige a senha atual
    // como prova de identidade (evita exclusão acidental ou por sessão sequestrada).
    public class ExcluirContaRequest
    {
        public string Senha { get; set; } = string.Empty;
    }
}
