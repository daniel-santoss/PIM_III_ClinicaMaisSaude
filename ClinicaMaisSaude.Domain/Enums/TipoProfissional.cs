namespace ClinicaMaisSaude.Domain.Enums
{
    public enum TipoProfissional
    {
        // Valores explícitos a partir de 1: são as chaves das tabelas lookup e o contrato
        // numérico da API. Começar em 0 fazia o primeiro item ser "falso" no JavaScript.
        Enfermeira = 1,
        Medico = 2
    }
}
