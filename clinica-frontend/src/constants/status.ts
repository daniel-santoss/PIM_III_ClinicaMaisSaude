export const statusAgendamento = {
  agendado: "Agendado",
  emAtendimento: "EmAtendimento",
  aguardandoRetorno: "AguardandoRetorno",
  retornoAgendado: "RetornoAgendado",
  finalizado: "Finalizado",
  faltou: "Faltou",
  cancelado: "Cancelado"
} as const;

export type StatusAgendamento = typeof statusAgendamento[keyof typeof statusAgendamento];
