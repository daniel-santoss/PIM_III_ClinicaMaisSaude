using System;

namespace ClinicaMaisSaude.Domain.Common
{
    /// <summary>
    /// Entidade mutável que carrega um carimbo de última atualização (updated-at).
    /// O valor é preenchido automaticamente no SaveChangesAsync do ClinicaDbContext
    /// sempre que a entidade é modificada — nunca manualmente pelos serviços.
    /// </summary>
    public interface IAuditavel
    {
        DateTime? UltAtualizacao { get; }
        void MarcarAtualizacao(DateTime quando);
    }
}
