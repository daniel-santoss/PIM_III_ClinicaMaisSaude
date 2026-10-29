using System;
using System.Collections.Generic;

namespace ClinicaMaisSaude.Application.DTOs.Escala
{
    /// <summary>Resumo de um dia no calendário do controle de escala (só números e alertas).</summary>
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

    public class EscalaMesResponse
    {
        public int Ano { get; set; }
        public int Mes { get; set; }
        public List<EscalaDiaResumo> Dias { get; set; } = new();
    }

    public class AusenciaResponse
    {
        public Guid Id { get; set; }
        public Guid ProfissionalId { get; set; }
        public string? Profissional { get; set; }
        /// <summary>Medico | Enfermeira.</summary>
        public string? TipoProfissional { get; set; }
        public DateTime Data { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public string? RegistradoPor { get; set; }
        public DateTime DtCriado { get; set; }
    }

    /// <summary>Profissional de plantão num dia (lista paginada do detalhe do dia).</summary>
    public class ProfissionalPlantao
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        /// <summary>Medico | Enfermeira.</summary>
        public string Tipo { get; set; } = string.Empty;
        /// <summary>Consultas agendadas com o profissional no dia.</summary>
        public int Consultas { get; set; }
        /// <summary>Preenchida quando o profissional está ausente no dia.</summary>
        public AusenciaResponse? Ausencia { get; set; }
    }

    public class PaginaProfissionaisPlantao
    {
        public List<ProfissionalPlantao> Itens { get; set; } = new();
        public int Total { get; set; }
        public int Pagina { get; set; }
        public int TamanhoPagina { get; set; }
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

    /// <summary>Detalhe de um dia (janela aberta ao clicar no calendário).</summary>
    public class EscalaDiaResponse
    {
        public DateTime Data { get; set; }
        public int Escala { get; set; }
        public int Medicos { get; set; }
        public int Enfermeiras { get; set; }
        /// <summary>Ausências que valem no dia (de quem estaria de plantão).</summary>
        public List<AusenciaResponse> Ausencias { get; set; } = new();
        public List<ConsultaARemarcar> ConsultasARemarcar { get; set; } = new();
        /// <summary>Quem está na escala do dia, paginado e filtrável por nome.</summary>
        public PaginaProfissionaisPlantao Profissionais { get; set; } = new();
    }

    /// <summary>Item da busca de profissionais do filtro da tela.</summary>
    public class ProfissionalResumo
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
    }

    public class DiaDoProfissional
    {
        public DateTime Data { get; set; }
        public bool Plantao { get; set; }
        public int Consultas { get; set; }
        /// <summary>Ausência que vale no dia (só em dia de plantão).</summary>
        public AusenciaResponse? Ausencia { get; set; }
    }

    /// <summary>Mês de um profissional: plantões, ausências e consultas por dia.</summary>
    public class EscalaProfissionalResponse
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public int Escala { get; set; }
        public DateTime InicioPlantoes { get; set; }
        public List<DiaDoProfissional> Dias { get; set; } = new();
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
