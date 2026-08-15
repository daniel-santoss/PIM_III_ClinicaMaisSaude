namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Situação do cadastro de um paciente. Substitui o antigo boolean Ativo.
    /// Só <see cref="Ativo"/> permite login/uso; qualquer outra situação bloqueia.
    /// </summary>
    public enum SituacaoCliente
    {
        Ativo = 1,
        Desativado = 2, // admin desliga (reversível)
        Excluido = 3,   // soft-delete pelo próprio paciente (self-service)
        Banido = 4      // banimento permanente (abuso de IA) — substitui o hack BloqueadoAte=+100 anos
    }
}
