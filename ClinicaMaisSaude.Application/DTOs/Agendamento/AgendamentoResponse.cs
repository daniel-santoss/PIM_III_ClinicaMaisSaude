using System;

namespace ClinicaMaisSaude.Application.DTOs.Agendamento
{
    public class AgendamentoResponse
    {
        public Guid Id { get; set; }
        public Guid PacienteId { get; set; }
        public string PacienteNome { get; set; } = string.Empty;
        public Guid ProfissionalId { get; set; }
        public string NomeProfissional { get; set; } = string.Empty;
        public DateTime DataHoraConsulta { get; set; }
        public string TipoProfissional { get; set; } = string.Empty;
        public string TipoConsulta { get; set; } = string.Empty;
        public string Especialidade { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? AgendamentoOrigemId { get; set; }
        public bool ResultadoDisponivel { get; set; }
        public bool ExigeResultadoPosterior { get; set; }
        public bool ResultadoRetirado { get; set; }
        public string NivelProbabilidadeFalta { get; set; } = "Baixa";
        public double ProbabilidadeFalta { get; set; }
        public DateTime DtCriado { get; set; }
        public string? PacienteFotoBase64 { get; set; }
        public string? ProfissionalFotoBase64 { get; set; }
    }
}
