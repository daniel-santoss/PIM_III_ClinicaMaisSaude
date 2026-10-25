namespace ClinicaMaisSaude.Domain.Enums
{
    public enum StatusAgendamento
    {
        // Valores explícitos a partir de 1: são as chaves das tabelas lookup e o contrato
        // numérico da API. Começar em 0 fazia o primeiro item ser "falso" no JavaScript.
        Agendado = 1,
        EmAtendimento = 2,
        AguardandoRetorno = 3,
        RetornoAgendado = 4,
        Finalizado = 5,
        Faltou = 6,
        Cancelado = 7
    }
}
