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

/** "yyyy-mm-dd" de uma data local (sem passar por UTC). */
export function chaveData(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Data local a partir de "yyyy-mm-dd" (aceita o ISO completo da API). */
export function dataDeChave(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Próximo plantão (a partir de hoje) de quem começou em `inicioIso`: o próprio início, se ainda
 * não chegou; senão, hoje ou amanhã, conforme a escala dele.
 */
export function proximoPlantao(inicioIso: string): string {
  const inicio = dataDeChave(inicioIso);
  const hoje = dataDeChave(chaveData(new Date()));
  if (inicio >= hoje) return chaveData(inicio);
  const d = new Date(hoje);
  if (escalaDoDia(d) !== escalaDoDia(inicio)) d.setDate(d.getDate() + 1);
  return chaveData(d);
}

/** Texto curto de quando a escala trabalha: "trabalha hoje" ou "trabalha amanhã". */
export function quandoTrabalha(escala: number): string {
  return escalaDoDia(new Date()) === escala ? "trabalha hoje" : "trabalha amanhã";
}
