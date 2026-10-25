import { API_URL } from './constants/api';
import { storageKeys } from './constants/storage';

const originalFetch = window.fetch;

// Renovação single-flight: se várias requisições tomam 401 juntas (ou o SignalR pede um
// token durante uma renovação), todas aguardam a mesma promessa e reusam o novo token.
let renovacaoEmCurso: Promise<string> | null = null;

function encerrarSessao() {
  localStorage.removeItem(storageKeys.authToken);
  localStorage.removeItem(storageKeys.refreshToken);
  window.location.reload();
}

async function chamarRefresh(): Promise<string> {
  const token = localStorage.getItem(storageKeys.authToken);
  const refreshToken = localStorage.getItem(storageKeys.refreshToken);
  if (!token || !refreshToken) throw new Error('sem-sessao');

  const res = await originalFetch(`${API_URL}/api/Auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, refreshToken })
  });

  if (!res.ok) {
    // O refresh token é de uso único. Se outra aba renovou com ele no mesmo instante, o
    // localStorage (compartilhado) já tem o par novo: a sessão segue válida, usa o dela.
    const atual = localStorage.getItem(storageKeys.refreshToken);
    const tokenAtual = localStorage.getItem(storageKeys.authToken);
    if (atual && atual !== refreshToken && tokenAtual) return tokenAtual;
    throw new Error('refresh-falhou');
  }

  const data = await res.json();
  localStorage.setItem(storageKeys.authToken, data.token);
  localStorage.setItem(storageKeys.refreshToken, data.refreshToken);
  return data.token;
}

export function renovarToken(): Promise<string> {
  if (!renovacaoEmCurso) {
    renovacaoEmCurso = chamarRefresh().finally(() => { renovacaoEmCurso = null; });
  }
  return renovacaoEmCurso;
}

// Lê o "exp" do JWT (sem validar assinatura: é só para decidir se vale renovar antes).
function expiraEmBreve(token: string, margemSegundos = 30): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64));
    return typeof exp !== 'number' || exp * 1000 - Date.now() < margemSegundos * 1000;
  } catch {
    return true;
  }
}

// Token para o SignalR. O handshake e as reconexões do hub não passam por este interceptor,
// então um JWT vencido (ex.: notebook que hibernou) derrubaria o tempo real. Renova antes.
export async function obterTokenValido(): Promise<string> {
  const token = localStorage.getItem(storageKeys.authToken);
  if (!token || !expiraEmBreve(token)) return token ?? '';
  try {
    return await renovarToken();
  } catch {
    encerrarSessao();
    return '';
  }
}

function comToken(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

window.fetch = async (input, init) => {
  const isAuthRoute = input.toString().includes('/login') || input.toString().includes('/refresh');
  let response = await originalFetch(input, init);

  // JWT vencido: renova em silêncio e repete a chamada. Só encerra a sessão se o refresh falhar.
  if (response.status === 401 && !isAuthRoute) {
    if (localStorage.getItem(storageKeys.authToken) && localStorage.getItem(storageKeys.refreshToken)) {
      try {
        const novoToken = await renovarToken();
        response = await originalFetch(input, comToken(init, novoToken));
      } catch {
        encerrarSessao();
      }
    } else {
      encerrarSessao();
    }
  }

  if (!response.ok) {
    if (!isAuthRoute || response.status === 500) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('addToast', { detail: { message: "Sessão expirada. Faça login novamente.", type: "error" } }));
      } else if (response.status === 403) {
        window.dispatchEvent(new CustomEvent('addToast', { detail: { message: "Você não tem permissão para esta ação.", type: "warning" } }));
      } else if (response.status === 404) {
        window.dispatchEvent(new CustomEvent('addToast', { detail: { message: "Registro não encontrado.", type: "error" } }));
      } else if (response.status === 500) {
        window.dispatchEvent(new CustomEvent('addToast', { detail: { message: "Erro interno. Tente novamente em instantes.", type: "error" } }));
      }
    }
  }

  return response;
};
