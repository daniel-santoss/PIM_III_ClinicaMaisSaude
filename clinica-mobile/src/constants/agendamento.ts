// Exibição de status/tipos/especialidades — espelha os mapas do web (statusMap.ts).
// A API devolve status/tipo/especialidade como nomes de enum (ex.: "Agendado").

export const STATUS_INFO: Record<string, { label: string; cor: string; fundo: string }> = {
  Agendado: { label: 'Agendado', cor: '#2C5282', fundo: '#EEF2F7' },
  EmAtendimento: { label: 'Em Atendimento', cor: '#B45309', fundo: '#FEF3C7' },
  AguardandoRetorno: { label: 'Aguardando Retorno', cor: '#B45309', fundo: '#FEF3C7' },
  RetornoAgendado: { label: 'Retorno Agendado', cor: '#2C5282', fundo: '#EEF2F7' },
  Finalizado: { label: 'Finalizado', cor: '#047857', fundo: '#D1FAE5' },
  Faltou: { label: 'Faltou', cor: '#B91C1C', fundo: '#FEE2E2' },
  Cancelado: { label: 'Cancelado', cor: '#6B7280', fundo: '#F3F4F6' },
};

// Status "ativos" (aba Próximas) vs. os demais (aba Histórico).
export const STATUS_ATIVOS = ['Agendado', 'EmAtendimento', 'AguardandoRetorno', 'RetornoAgendado'];

// O paciente só pode cancelar consultas ainda não iniciadas.
export const STATUS_CANCELAVEIS = ['Agendado', 'RetornoAgendado'];

// Códigos numéricos que a API espera (chaves das tabelas lookup, começam em 1).
// Use estes nomes em vez de números soltos.
export const STATUS_CANCELADO_COD = 7;

export const TIPO_PROFISSIONAL = { enfermeira: 1, medico: 2 } as const;

export const TIPO_CONSULTA = {
  triagem: 1,
  exame: 2,
  vacina: 3,
  consultaMedica: 4,
  retorno: 5,
} as const;

export const TIPO_CONSULTA_LABEL: Record<string, string> = {
  Triagem: 'Triagem',
  Exame: 'Exame',
  Vacina: 'Vacina',
  ConsultaMedica: 'Consulta Médica',
  Retorno: 'Retorno',
};

export const ESPECIALIDADE_LABEL: Record<string, string> = {
  ClinicaGeral: 'Clínica Geral',
  MedicinaDeFamilia: 'Medicina de Família',
  Pediatria: 'Pediatria',
  GinecologiaEObstetricia: 'Ginecologia e Obstetrícia',
  Cardiologia: 'Cardiologia',
  Dermatologia: 'Dermatologia',
  Endocrinologia: 'Endocrinologia',
  Gastroenterologia: 'Gastroenterologia',
  Neurologia: 'Neurologia',
  OrtopediaETraumatologia: 'Ortopedia e Traumatologia',
  Psiquiatria: 'Psiquiatria',
  Otorrinolaringologia: 'Otorrinolaringologia',
  Oftalmologia: 'Oftalmologia',
  Urologia: 'Urologia',
  Pneumologia: 'Pneumologia',
  Reumatologia: 'Reumatologia',
  Geriatria: 'Geriatria',
  MedicinaEsportiva: 'Medicina Esportiva',
};
