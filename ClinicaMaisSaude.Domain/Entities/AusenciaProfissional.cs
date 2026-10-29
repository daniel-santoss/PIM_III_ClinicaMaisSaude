using System;
using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Folga ou ausência de um profissional num dia em que ele estaria de plantão (imprevisto,
    /// atestado, férias). Enquanto existir, a agenda dele fica fechada nesse dia: não aparecem
    /// horários livres nem ele recebe novas consultas. Uma linha por profissional por dia.
    /// </summary>
    public class AusenciaProfissional
    {
        public const int TamanhoMaximoMotivo = 200;

        public Guid Id { get; private set; }
        public Guid ProfissionalId { get; private set; }
        /// <summary>Dia da ausência (só a data; o plantão inteiro fica fechado).</summary>
        public DateTime Data { get; private set; }
        public string Motivo { get; private set; } = string.Empty;
        /// <summary>Usuário que registrou a ausência.</summary>
        public Guid? RegistradoPor { get; private set; }
        public DateTime DtCriado { get; private set; }

        public virtual Profissional? Profissional { get; private set; }

        protected AusenciaProfissional() { } // EF Core

        public AusenciaProfissional(Guid profissionalId, DateTime data, string motivo, Guid? registradoPor)
        {
            if (string.IsNullOrWhiteSpace(motivo))
                throw new ArgumentException("Informe o motivo da ausência.", nameof(motivo));

            Id = SequentialGuid.Next();
            ProfissionalId = profissionalId;
            Data = data.Date;
            Motivo = motivo.Trim();
            RegistradoPor = registradoPor;
            DtCriado = DateTime.UtcNow;
        }
    }
}
