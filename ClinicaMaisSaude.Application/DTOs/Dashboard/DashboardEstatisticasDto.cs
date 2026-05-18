namespace ClinicaMaisSaude.Application.DTOs.Dashboard
{
    public class DashboardEstatisticasDto
    {
        public int TotalAgendamentos { get; set; }
        public Dictionary<string, int> AgendamentosPorStatus { get; set; } = new();
        public List<AgendamentoPorDiaDto> AgendamentosPorDia { get; set; } = new();
        public List<EspecialidadeRankingDto> EspecialidadesMaisProcuradas { get; set; } = new();
        public decimal TaxaAbsenteismo { get; set; }
        public List<PacientesNovosVsRecorrentesDto> PacientesNovosVsRecorrentes { get; set; } = new();
        public List<ProfissionalCargaDto>? AgendamentosPorProfissional { get; set; }
        public List<RiscoFaltaDto> TopRiscoFalta { get; set; } = new();
        public FluxoExamesDto FluxoExames { get; set; } = new();
        public AuditoriaIADto? AuditoriaIA { get; set; }
    }

    public class AgendamentoPorDiaDto
    {
        public string Data { get; set; } = "";
        public int Total { get; set; }
    }

    public class EspecialidadeRankingDto
    {
        public string Nome { get; set; } = "";
        public int Total { get; set; }
    }

    public class PacientesNovosVsRecorrentesDto
    {
        public string Mes { get; set; } = "";
        public int Novos { get; set; }
        public int Recorrentes { get; set; }
    }

    public class ProfissionalCargaDto
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = "";
        public int Total { get; set; }
    }

    public class RiscoFaltaDto
    {
        public Guid AgendamentoId { get; set; }
        public Guid PacienteId { get; set; }
        public string NomePaciente { get; set; } = "";
        public double Probabilidade { get; set; }
        public string DataConsulta { get; set; } = "";
    }

    public class FluxoExamesDto
    {
        public int Total { get; set; }
        public int Liberados { get; set; }
        public int Pendentes { get; set; }
    }

    public class AuditoriaIADto
    {
        public int TotalInjecoes { get; set; }
        public int TotalUsoIndevido { get; set; }
        public int Bloqueados { get; set; }
    }

    public class DetalhesProfissionalDto
    {
        public Dictionary<string, int> DistribuicaoPorStatus { get; set; } = new();
        public List<UltimoAgendamentoDto> UltimosAgendamentos { get; set; } = new();
    }

    public class UltimoAgendamentoDto
    {
        public string Data { get; set; } = "";
        public string Paciente { get; set; } = "";
        public string Status { get; set; } = "";
    }
}
