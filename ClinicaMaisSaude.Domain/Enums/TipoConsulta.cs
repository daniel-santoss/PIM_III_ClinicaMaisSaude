namespace ClinicaMaisSaude.Domain.Enums
{
    public enum TipoConsulta
    {
        // Valores explícitos a partir de 1: são as chaves das tabelas lookup e o contrato
        // numérico da API. Começar em 0 fazia o primeiro item ser "falso" no JavaScript.
        Triagem = 1,
        Exame = 2,
        Vacina = 3,
        ConsultaMedica = 4,
        Retorno = 5
    }
}
