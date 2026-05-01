using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    public class ProfissionalEspecialidade
    {
        public Guid ProfissionalId { get; private set; }
        public EspecialidadeMedica EspecialidadeId { get; private set; }

        public Profissional Profissional { get; private set; }

        protected ProfissionalEspecialidade() { }

        public ProfissionalEspecialidade(Guid profissionalId, EspecialidadeMedica especialidadeId)
        {
            ProfissionalId = profissionalId;
            EspecialidadeId = especialidadeId;
        }
    }
}
