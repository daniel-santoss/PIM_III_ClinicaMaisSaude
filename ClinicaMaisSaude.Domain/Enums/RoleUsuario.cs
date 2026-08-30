namespace ClinicaMaisSaude.Domain.Enums
{
    // Papel unificado do usuário. Substitui a taxonomia de dois níveis
    // (TipoUsuario + TipoProfissional) — Fase A do refactor. A permissão segue
    // no papel granular (Medico ≠ Enfermeira).
    public enum RoleUsuario
    {
        Paciente = 1,
        Admin = 2,
        Medico = 3,
        Enfermeira = 4
    }
}
