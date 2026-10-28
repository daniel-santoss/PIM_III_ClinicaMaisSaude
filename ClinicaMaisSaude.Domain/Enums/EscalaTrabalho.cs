namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Turma do profissional na escala 12x36: as duas escalas se revezam dia sim, dia não,
    /// sem quebra na virada do mês (ver <c>Expediente.EscalaDoDia</c>).
    /// </summary>
    public enum EscalaTrabalho
    {
        Escala1 = 1,
        Escala2 = 2
    }
}
