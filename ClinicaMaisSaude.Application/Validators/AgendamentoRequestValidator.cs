using ClinicaMaisSaude.Application.DTOs.Agendamento;
using ClinicaMaisSaude.Domain.Enums;
using FluentValidation;

namespace ClinicaMaisSaude.Application.Validators
{
    // Os tipos chegam como inteiros: um valor fora do enum viraria erro de chave estrangeira (500).
    public class AgendamentoRequestValidator : AbstractValidator<AgendamentoRequest>
    {
        public AgendamentoRequestValidator()
        {
            RuleFor(x => x.TipoProfissional)
                .Must(v => Enum.IsDefined(typeof(TipoProfissional), v)).WithMessage("Tipo de profissional inválido.");

            RuleFor(x => x.TipoConsulta)
                .Must(v => Enum.IsDefined(typeof(TipoConsulta), v)).WithMessage("Tipo de consulta inválido.");

            RuleFor(x => x.EspecialidadeId)
                .Must(v => Enum.IsDefined(typeof(EspecialidadeMedica), v!.Value)).When(x => x.EspecialidadeId.HasValue)
                .WithMessage("Especialidade inválida.");
        }
    }
}
