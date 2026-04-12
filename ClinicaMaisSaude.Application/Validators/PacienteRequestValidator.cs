using ClinicaMaisSaude.Application.DTOs.Paciente;
using FluentValidation;
using System.Linq; // Obrigatório para usar o .All()
using System;

namespace ClinicaMaisSaude.Application.Validators
{
    public class PacienteRequestValidator : AbstractValidator<PacienteRequest>
    {
        public PacienteRequestValidator()
        {
            RuleFor(x => x.Nome)
                .NotEmpty().WithMessage("O Nome é obrigatório.")
                .Length(3, 100).WithMessage("O Nome deve ter entre 3 e 100 caracteres.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("O E-mail é obrigatório.")
                .Matches(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
                .WithMessage("O formato do e-mail é inválido.");

            // Regra unificada do CPF: Passa a bola totalmente para a sua função matemática
            RuleFor(x => x.Cpf)
                .NotEmpty().WithMessage("O CPF é obrigatório.")
                .Must(ValidarCpf).WithMessage("O CPF fornecido é inválido.");

            RuleFor(x => x.Telefone)
                .NotEmpty().WithMessage("O Telefone é obrigatório.")
                .Length(11).WithMessage("O Telefone deve ter exatamente 11 dígitos, incluindo o DDD.");
        }

        private bool ValidarCpf(string cpf)
        {
            if (string.IsNullOrWhiteSpace(cpf)) return false;

            cpf = cpf.Replace(".", "").Replace("-", "");

            if (cpf.Length != 11) return false;

            // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
            if (cpf.All(c => c == cpf[0])) return false;

            // Calcula o primeiro dígito verificador
            int[] multiplicador1 = { 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            string tempCpf = cpf.Substring(0, 9);
            int soma = 0;

            for (int i = 0; i < 9; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador1[i];

            int resto = soma % 11;
            resto = resto < 2 ? 0 : 11 - resto;
            string digito = resto.ToString();

            // Calcula o segundo dígito verificador
            tempCpf += digito;
            soma = 0;
            int[] multiplicador2 = { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };

            for (int i = 0; i < 10; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador2[i];

            resto = soma % 11;
            resto = resto < 2 ? 0 : 11 - resto;
            digito += resto.ToString();

            return cpf.EndsWith(digito);
        }
    }
}