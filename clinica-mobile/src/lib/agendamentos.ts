import { STATUS_CANCELADO_COD } from '@/constants/agendamento';
import { apiFetch } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';
import type { Agendamento } from '@/types/agendamento';

// Lista as consultas do paciente logado (a API filtra pelo PacienteId do token).
export async function listarMinhasConsultas(): Promise<Agendamento[]> {
  const res = await apiFetch('/api/Agendamentos?pageSize=200&ordem=desc');
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível carregar suas consultas.'));
  }
  const data = await res.json();
  // O endpoint pode devolver { items: [...] } (paginado) ou uma lista direta.
  return (data.items ?? data) as Agendamento[];
}

// Cancela uma consulta (transição de status para Cancelado).
export async function cancelarConsulta(id: string): Promise<void> {
  const res = await apiFetch(`/api/Agendamentos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(STATUS_CANCELADO_COD),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível cancelar a consulta.'));
  }
}

// Remarca a consulta para nova data/hora. `observacao` (motivo) é obrigatória
// no backend para registro de auditoria.
export async function remarcarConsulta(id: string, novaDataHora: string, observacao: string): Promise<void> {
  const res = await apiFetch(`/api/Agendamentos/${id}/remarcar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novaDataHora, observacao }),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível remarcar a consulta.'));
  }
}
