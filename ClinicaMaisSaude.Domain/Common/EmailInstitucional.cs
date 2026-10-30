using System;

namespace ClinicaMaisSaude.Domain.Common
{
    /// <summary>
    /// E-mail institucional da clínica. O domínio é exclusivo da equipe: médicos e enfermeiras
    /// usam obrigatoriamente o domínio da clínica, e o paciente nunca (usa o e-mail pessoal).
    /// </summary>
    public static class EmailInstitucional
    {
        public const string Dominio = "@clinicamaissaude.com.br";

        public const string Exigencia = "Médicos e enfermeiras devem usar o e-mail institucional (" + Dominio + ").";

        public const string ExclusivoDaEquipe = "O domínio " + Dominio + " é exclusivo da equipe da clínica. Use o seu e-mail pessoal.";

        /// <summary>Termina no domínio da clínica, com algo antes da (única) arroba.</summary>
        public static bool EhInstitucional(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            var valor = email.Trim();
            return valor.Length > Dominio.Length
                && valor.EndsWith(Dominio, StringComparison.OrdinalIgnoreCase)
                && valor.IndexOf('@') == valor.Length - Dominio.Length;
        }
    }
}
