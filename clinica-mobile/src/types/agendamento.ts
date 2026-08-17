// Subconjunto do AgendamentoResponse relevante para o paciente no mobile.
export interface Agendamento {
  id: string;
  dataHoraConsulta: string;
  tipoConsulta: string;
  status: string;
  nomeProfissional: string;
  especialidade?: string;
  agendamentoOrigemId?: string;
}
