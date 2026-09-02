namespace ClinicaMaisSaude.Domain.Enums
{
    /// <summary>
    /// Situação unificada de uma conta/cadastro (paciente ou profissional). Substitui os antigos
    /// SituacaoCliente e SituacaoProfissional (unificados a pedido — os estados se repetiam).
    /// Só <see cref="Ativo"/> permite login/uso. A validade por tipo é garantida na camada de
    /// domínio (cada entidade só transiciona para os estados que fazem sentido para ela):
    /// paciente usa Ativo/Inativo/Excluido/Banido/EmAnalise; profissional usa Ativo/Inativo.
    /// </summary>
    public enum Situacao
    {
        Ativo = 1,
        Inativo = 2,    // admin desliga (paciente, reversível) / profissional saiu da clínica
        Excluido = 3,   // soft-delete pelo próprio paciente (self-service)
        Banido = 4,     // banimento permanente (abuso de IA)
        EmAnalise = 5   // proponente do auto-cadastro moderado, aguardando aprovação (sem login)
    }
}
