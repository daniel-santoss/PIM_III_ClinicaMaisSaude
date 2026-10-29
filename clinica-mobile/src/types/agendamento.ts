// Subconjunto do AgendamentoResponse relevante para o paciente no mobile.
export interface Agendamento {
  id: string;
  dataHoraConsulta: string;
  tipoConsulta: string;
  status: string;
  nomeProfissional: string;
  profissionalId?: string;
  especialidade?: string;
  agendamentoOrigemId?: string;
  // Acompanhamento de resultado de exame (informativo para o paciente).
  exigeResultadoPosterior?: boolean;
  resultadoDisponivel?: boolean;
  resultadoRetirado?: boolean;
}
