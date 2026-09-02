using System.Linq;

namespace ClinicaMaisSaude.Domain.Common
{
    /// <summary>
    /// Utilitários de CPF (sanitização + validação de dígitos verificadores). Centraliza a regra
    /// que antes vivia duplicada nos serviços. (A evolução para Value Object fica na Thread C ④.)
    /// </summary>
    public static class Cpf
    {
        /// <summary>Remove tudo que não é dígito.</summary>
        public static string Sanitizar(string? cpf) =>
            new string((cpf ?? string.Empty).Where(char.IsDigit).ToArray());

        /// <summary>Valida matematicamente um CPF (aceita com ou sem máscara).</summary>
        public static bool EhValido(string? cpf)
        {
            var limpo = Sanitizar(cpf);
            if (limpo.Length != 11) return false;
            if (limpo.Distinct().Count() == 1) return false; // todos os dígitos iguais

            var multiplicador1 = new[] { 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            var multiplicador2 = new[] { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };

            var tempCpf = limpo.Substring(0, 9);
            var soma = 0;
            for (int i = 0; i < 9; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador1[i];

            var resto = soma % 11;
            resto = resto < 2 ? 0 : 11 - resto;

            var digito = resto.ToString();
            tempCpf += digito;
            soma = 0;
            for (int i = 0; i < 10; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador2[i];

            resto = soma % 11;
            resto = resto < 2 ? 0 : 11 - resto;

            digito += resto.ToString();
            return limpo.EndsWith(digito);
        }
    }
}
