using System;

namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Ponte entre a categoria de agenda (<see cref="TipoProfissional"/>) e o papel unificado
    /// da conta (<see cref="RoleUsuario"/>). Existe porque, a partir da Fase A3b, a categoria do
    /// profissional deriva do <c>Role</c> — a coluna <c>Profissional.TipoProfissional</c> foi
    /// removida —, mas o agendamento continua raciocinando em <see cref="TipoProfissional"/>.
    /// </summary>
    public static class PapeisMap
    {
        /// <summary>Papel da conta correspondente a uma categoria de agenda.</summary>
        public static RoleUsuario RoleDoTipo(TipoProfissional tipo) => tipo switch
        {
            TipoProfissional.Medico => RoleUsuario.Medico,
            TipoProfissional.Enfermeira => RoleUsuario.Enfermeira,
            _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, "Categoria de profissional sem papel correspondente.")
        };
    }
}
