namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Propósito de um <c>CodigoVerificacao</c> (código de e-mail de uso único). É o discriminador da
    /// tabela unificada: em vez de uma tabela por fluxo, uma só tabela guarda os três tipos de código,
    /// diferindo apenas no alvo (Usuario / Pessoa+Solicitacao / e-mail avulso).
    /// </summary>
    public enum TipoVerificacao
    {
        RecuperacaoSenha = 1,
        PrimeiroAcesso = 2,
        VerificacaoEmail = 3
    }
}
