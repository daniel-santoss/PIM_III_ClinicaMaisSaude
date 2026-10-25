namespace ClinicaMaisSaude.Domain.Enums
{
    public enum EspecialidadeMedica
    {
        // Valores explícitos a partir de 1: são as chaves das tabelas lookup e o contrato
        // numérico da API. Começar em 0 fazia o primeiro item ser "falso" no JavaScript.
        ClinicaGeral = 1,
        MedicinaDeFamilia = 2,
        Pediatria = 3,
        GinecologiaEObstetricia = 4,
        Cardiologia = 5,
        Dermatologia = 6,
        Endocrinologia = 7,
        Gastroenterologia = 8,
        Neurologia = 9,
        OrtopediaETraumatologia = 10,
        Psiquiatria = 11,
        Otorrinolaringologia = 12,
        Oftalmologia = 13,
        Urologia = 14,
        Pneumologia = 15,
        Reumatologia = 16,
        Geriatria = 17,
        MedicinaEsportiva = 18
    }
}
