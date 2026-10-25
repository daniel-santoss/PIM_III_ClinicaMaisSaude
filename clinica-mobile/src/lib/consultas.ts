import { apiFetch } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';

export interface SugestaoIA {
  tipoProfissional: string; // "Médico" | "Enfermeira"
  especialidade: string; // nome do enum, ex.: "Cardiologia"
  tipoConsulta: string; // "Triagem" | "Exame" | "Vacina" | "ConsultaMedica" | "Retorno"
  justificativa?: string;
  // Presentes apenas quando a IA detecta crise emocional (acolhe, sem punir):
  // o backend devolve crise=true + mensagem de apoio e sugere Psiquiatria.
  crise?: boolean;
  mensagem?: string;
}

// Frase-marcador que o backend devolve quando detecta injeção de prompt (conta é banida).
export const MARCADOR_INJECAO = 'Detectamos uma tentativa deliberada';

export async function sugerirTipo(sintomas: string): Promise<SugestaoIA> {
  const res = await apiFetch('/api/Consultas/sugerir-tipo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sintomas }),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível analisar seus sintomas.'));
  }
  return (await res.json()) as SugestaoIA;
}

export interface Especialidade {
  id: number;
  nome: string;
}

export async function listarEspecialidades(): Promise<Especialidade[]> {
  const res = await apiFetch('/api/Especialidades/lista');
  if (!res.ok) return [];
  return (await res.json()) as Especialidade[];
}

// IDs das especialidades que têm ao menos um médico disponível (espelha o web).
export async function especialidadesDisponiveis(): Promise<number[]> {
  const res = await apiFetch('/api/Especialidades/disponiveis');
  if (!res.ok) return [];
  return (await res.json()) as number[];
}

export async function horariosDisponiveis(
  data: string,
  tipoConsulta: number,
  especialidadeId?: number,
  origemId?: string,
): Promise<string[]> {
  let q = `?data=${data}&tipoConsulta=${tipoConsulta}`;
  if (tipoConsulta === 3 && especialidadeId) q += `&especialidadeId=${especialidadeId}`;
  else if (tipoConsulta === 4 && origemId) q += `&origemId=${origemId}`;
  const res = await apiFetch(`/api/Agendamentos/horarios-disponiveis${q}`);
  if (!res.ok) return [];
  return (await res.json()) as string[];
}

// Dias do mês (yyyy-MM-dd), a partir de hoje, com ao menos um horário livre — pinta o calendário.
export async function diasDisponiveis(
  ano: number,
  mes: number, // 1..12
  tipoConsulta: number,
  especialidadeId?: number,
  origemId?: string,
): Promise<string[]> {
  let q = `?ano=${ano}&mes=${mes}&tipoConsulta=${tipoConsulta}`;
  if (tipoConsulta === 3 && especialidadeId != null) q += `&especialidadeId=${especialidadeId}`;
  else if (tipoConsulta === 4 && origemId) q += `&origemId=${origemId}`;
  const res = await apiFetch(`/api/Agendamentos/dias-disponiveis${q}`);
  if (!res.ok) return [];
  return (await res.json()) as string[];
}

export interface CriarAgendamentoInput {
  pacienteId: string;
  dataHoraConsulta: string; // "YYYY-MM-DDTHH:mm:00"
  tipoProfissional: number;
  tipoConsulta: number;
  especialidadeId: number | null;
  observacao: string;
  agendamentoOrigemId?: string | null; // obrigatório para Retorno (tipoConsulta 4)
}

// O backend delega o profissional na criação e devolve nome + foto dele.
export interface AgendamentoCriado {
  nomeProfissional: string;
  profissionalFotoBase64: string | null;
}

export async function criarAgendamento(input: CriarAgendamentoInput): Promise<AgendamentoCriado> {
  const res = await apiFetch('/api/Agendamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agendamentoOrigemId: null, ...input }),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível concluir o agendamento.'));
  }
  const data = (await res.json().catch(() => ({}))) as {
    nomeProfissional?: string;
    profissionalFotoBase64?: string | null;
  };
  return {
    nomeProfissional: data.nomeProfissional ?? '',
    profissionalFotoBase64: data.profissionalFotoBase64 ?? null,
  };
}

// Conversão dos textos da IA para os inteiros do enum do backend (espelha o web).
export function tipoProfissionalParaInt(texto: string): number {
  return texto === 'Enfermeira' ? 0 : 1; // padrão: Médico
}

export function tipoConsultaParaInt(texto: string): number {
  switch (texto) {
    case 'Triagem':
      return 0;
    case 'Exame':
      return 1;
    case 'Vacina':
      return 2;
    case 'Retorno':
      return 4;
    default:
      return 3; // ConsultaMedica
  }
}
