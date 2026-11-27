using ClinicaMaisSaude.Application.DTOs.Agendamento;
using FluentValidation;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Application.Validators
{
    public class RemarcarAgendamentoRequestValidator : AbstractValidator<RemarcarAgendamentoRequest>
    {
        public RemarcarAgendamentoRequestValidator()
        {
            RuleFor(x => x.NovaDataHora)
                .NotEmpty().WithMessage("A nova data e hora são obrigatórias.")
                .GreaterThan(_ => Relogio.Agora).WithMessage("A nova data deve ser no futuro.");

            RuleFor(x => x.Observacao)
                .NotEmpty().WithMessage("A observação é obrigatória para remarcações.")
                .MinimumLength(5).WithMessage("A observação deve ter pelo menos 5 caracteres.");
        }
    }
}
