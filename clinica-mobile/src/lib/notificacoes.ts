import { apiFetch } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';
import type { Notificacao } from '@/types/notificacao';

// Lista as notificações do usuário logado (a API filtra pelo token).
export async function listarNotificacoes(): Promise<Notificacao[]> {
  const res = await apiFetch('/api/Notificacoes');
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível carregar suas notificações.'));
  }
  return (await res.json()) as Notificacao[];
}

// Marca uma notificação como lida (PATCH → 204 No Content).
export async function marcarComoLida(id: string): Promise<void> {
  const res = await apiFetch(`/api/Notificacoes/${id}/lida`, { method: 'PATCH' });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível marcar como lida.'));
  }
}

// Remove uma notificação (DELETE → 204 No Content).
export async function removerNotificacao(id: string): Promise<void> {
  const res = await apiFetch(`/api/Notificacoes/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível remover a notificação.'));
  }
}
