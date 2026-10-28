using System;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Application.DTOs.Escala
{
    /// <summary>Resumo de um dia no calendário do controle de escala.</summary>
    public class EscalaDiaResumo
    {
        public DateTime Data { get; set; }
        /// <summary>Escala de plantão no dia (1 ou 2).</summary>
        public int Escala { get; set; }
        /// <summary>Médicos de plantão (já descontadas as ausências).</summary>
        public int Medicos { get; set; }
        /// <summary>Enfermeiras de plantão (já descontadas as ausências).</summary>
        public int Enfermeiras { get; set; }
        public int Ausencias { get; set; }
        /// <summary>Consultas agendadas com profissional que não está de plantão no dia.</summary>
        public int ConsultasARemarcar { get; set; }
    }

    /// <summary>Quantos profissionais compõem cada escala (cadastro, sem considerar ausências).</summary>
    public class ComposicaoEscala
    {
        public int Escala { get; set; }
        public int Medicos { get; set; }
        public int Enfermeiras { get; set; }
    }

    public class EscalaMesResponse
    {
        public int Ano { get; set; }
        public int Mes { get; set; }
        public List<EscalaDiaResumo> Dias { get; set; } = new();
        public List<ComposicaoEscala> Composicao { get; set; } = new();
    }

    public class AusenciaResponse
    {
        public Guid Id { get; set; }
        public Guid ProfissionalId { get; set; }
        public DateTime Data { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public string? RegistradoPor { get; set; }
        public DateTime DtCriado { get; set; }
    }

    public class ProfissionalPlantao
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        /// <summary>Medico | Enfermeira.</summary>
        public string Tipo { get; set; } = string.Empty;
        public List<int> Especialidades { get; set; } = new();
        /// <summary>Consultas agendadas com o profissional no dia.</summary>
        public int Consultas { get; set; }
        /// <summary>Preenchida quando o profissional está ausente no dia.</summary>
        public AusenciaResponse? Ausencia { get; set; }
    }

    public class ConsultaARemarcar
    {
        public Guid Id { get; set; }
        public DateTime DataHoraConsulta { get; set; }
        /// <summary>Nome do tipo (como em AgendamentoResponse): Triagem, ConsultaMedica...</summary>
        public string TipoConsulta { get; set; } = string.Empty;
        public string Paciente { get; set; } = string.Empty;
        public Guid ProfissionalId { get; set; }
        public string Profissional { get; set; } = string.Empty;
        /// <summary>"Ausência" ou "Fora da escala".</summary>
        public string Motivo { get; set; } = string.Empty;
    }

    public class EscalaDiaResponse
    {
        public DateTime Data { get; set; }
        public int Escala { get; set; }
        /// <summary>Profissionais da escala do dia, ausentes incluídos (marcados).</summary>
        public List<ProfissionalPlantao> Profissionais { get; set; } = new();
        public List<ConsultaARemarcar> ConsultasARemarcar { get; set; } = new();
    }

    public class RegistrarAusenciaRequest
    {
        public Guid ProfissionalId { get; set; }
        public DateTime Data { get; set; }
        public string Motivo { get; set; } = string.Empty;
    }

    public class RegistrarAusenciaResponse
    {
        public AusenciaResponse Ausencia { get; set; } = new();
        /// <summary>Consultas do profissional no dia que precisam ser remarcadas.</summary>
        public int ConsultasARemarcar { get; set; }
    }
}
