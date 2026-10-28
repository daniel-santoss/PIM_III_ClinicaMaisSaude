// Escala 12x36: as duas escalas se revezam dia sim, dia não, a partir de uma data de
// referência (espelha Expediente.EscalaDoDia no backend). A alternância é contínua: não
// segue a paridade do dia do mês, para ninguém trabalhar dois dias seguidos na virada de 31.

export const escalaCod = {
  escala1: 1,
  escala2: 2
} as const;

export type EscalaCod = (typeof escalaCod)[keyof typeof escalaCod];

export const nomeEscala = (escala: number) => `Escala ${escala}`;

// Dia em que a Escala 1 trabalha (01/01/2026), em UTC para não sofrer com horário de verão.
const REFERENCIA_UTC = Date.UTC(2026, 0, 1);
const DIA_MS = 86_400_000;

/** Escala de plantão no dia (data local; o horário é ignorado). */
export function escalaDoDia(data: Date): EscalaCod {
  const dias = Math.round((Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) - REFERENCIA_UTC) / DIA_MS);
  return ((dias % 2) + 2) % 2 === 0 ? escalaCod.escala1 : escalaCod.escala2;
}

/** Texto curto de quando a escala trabalha: "trabalha hoje" ou "trabalha amanhã". */
export function quandoTrabalha(escala: number): string {
  return escalaDoDia(new Date()) === escala ? "trabalha hoje" : "trabalha amanhã";
}
