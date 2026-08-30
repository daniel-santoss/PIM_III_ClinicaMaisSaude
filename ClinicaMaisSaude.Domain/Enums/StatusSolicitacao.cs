namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Estado da análise de uma <c>SolicitacaoCadastro</c> (auto-cadastro moderado).
    /// É a fonte da verdade do fluxo de aprovação; a situação do Paciente (EmAnalise/Ativo)
    /// caminha em paralelo.
    /// </summary>
    public enum StatusSolicitacao
    {
        EmAnalise = 1,
        Aprovada = 2,
        Recusada = 3
    }
}
