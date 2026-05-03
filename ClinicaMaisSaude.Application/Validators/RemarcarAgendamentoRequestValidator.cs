using ClinicaMaisSaude.Application.DTOs.Agendamento;
using FluentValidation;

namespace ClinicaMaisSaude.Application.Validators
{
    public class RemarcarAgendamentoRequestValidator : AbstractValidator<RemarcarAgendamentoRequest>
    {
        public RemarcarAgendamentoRequestValidator()
        {
            RuleFor(x => x.NovaDataHora)
                .NotEmpty().WithMessage("A nova data e hora são obrigatórias.")
                .GreaterThan(DateTime.UtcNow).WithMessage("A nova data deve ser no futuro.");

            RuleFor(x => x.Observacao)
                .NotEmpty().WithMessage("A observação é obrigatória para remarcações.")
                .MinimumLength(5).WithMessage("A observação deve ter pelo menos 5 caracteres.");
        }
    }
}
