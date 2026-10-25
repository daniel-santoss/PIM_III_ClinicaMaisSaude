import { statusAgendamento } from "./status";

// Códigos numéricos que a API espera (são as chaves das tabelas lookup e começam em 1).
// Use sempre estes nomes em vez de números soltos no código.

export const tipoProfissionalCod = {
  enfermeira: 1,
  medico: 2
} as const;

export const tipoConsultaCod = {
  triagem: 1,
  exame: 2,
  vacina: 3,
  consultaMedica: 4,
  retorno: 5
} as const;

export const statusCod = {
  [statusAgendamento.agendado]: 1,
  [statusAgendamento.emAtendimento]: 2,
  [statusAgendamento.aguardandoRetorno]: 3,
  [statusAgendamento.retornoAgendado]: 4,
  [statusAgendamento.finalizado]: 5,
  [statusAgendamento.faltou]: 6,
  [statusAgendamento.cancelado]: 7
} as const;
