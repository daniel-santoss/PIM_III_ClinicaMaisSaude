import { API_URL } from '@/constants/api';
import { storageKeys } from '@/constants/storage';
import { storage } from '@/lib/storage';

// Cliente HTTP do app. Espelha o fetchInterceptor do web (refresh transparente
// em 401, single-flight com fila) — mas como função explícita, sem monkey-patch
// do fetch global (mais idiomático em RN e testável).

type OnSessionExpired = () => void;
let onSessionExpired: OnSessionExpired | null = null;

// A UI (raiz de navegação) registra aqui como reagir ao fim de sessão
// (limpar estado + mandar para o login). Evita acoplar este módulo à navegação.
export function setOnSessionExpired(cb: OnSessionExpired | null) {
  onSessionExpired = cb;
}

// Controle de refresh concorrente: só um refresh acontece por vez; as demais
// requisições que tomaram 401 no meio esperam nesta fila e reusam o novo token.
let isRefreshing = false;
let queue: { resolve: (token: string | null) => void; reject: (err: unknown) => void }[] = [];

function flushQueue(error: unknown, token: string | null) {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
}

async function refreshTokens(): Promise<string> {
  const token = await storage.get(storageKeys.authToken);
  const refreshToken = await storage.get(storageKeys.refreshToken);
  if (!token || !refreshToken) throw new Error('sem-tokens');

  const res = await fetch(`${API_URL}/api/Auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, refreshToken }),
  });
  if (!res.ok) throw new Error('refresh-falhou');

  const data = (await res.json()) as { token: string; refreshToken: string };
  await storage.set(storageKeys.authToken, data.token);
  await storage.set(storageKeys.refreshToken, data.refreshToken);
  return data.token;
}

async function clearSession() {
  await storage.remove(storageKeys.authToken);
  await storage.remove(storageKeys.refreshToken);
  onSessionExpired?.();
}

export interface ApiOptions extends RequestInit {
  /** Anexa automaticamente o Bearer token (default: true). */
  auth?: boolean;
}

/**
 * Faz a requisição anexando o Bearer token e, em caso de 401, tenta um único
 * refresh e repete a chamada original. Se o refresh falhar, encerra a sessão e
 * devolve o 401 para quem chamou tratar.
 *
 * `path` pode ser absoluto (http...) ou relativo à API_URL (ex.: "/api/Notificacoes").
 */
export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { auth = true, headers, ...rest } = options;
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  const buildHeaders = async (): Promise<Headers> => {
    const h = new Headers(headers as HeadersInit | undefined);
    if (auth) {
      const token = await storage.get(storageKeys.authToken);
      if (token) h.set('Authorization', `Bearer ${token}`);
    }
    return h;
  };

  let response = await fetch(url, { ...rest, headers: await buildHeaders() });

  const isAuthRoute = url.includes('/Auth/login') || url.includes('/Auth/refresh');
  if (response.status !== 401 || !auth || isAuthRoute) return response;

  // 401 numa rota protegida: tentar renovar o token.
  let newToken: string | null = null;
  if (isRefreshing) {
    // Já há um refresh em curso — aguarda o resultado dele.
    try {
      newToken = await new Promise<string | null>((resolve, reject) => {
        queue.push({ resolve, reject });
      });
    } catch {
      return response; // refresh do líder falhou; devolve o 401 original
    }
  } else {
    isRefreshing = true;
    try {
      newToken = await refreshTokens();
      flushQueue(null, newToken);
    } catch (err) {
      flushQueue(err, null);
      await clearSession();
      return response; // devolve o 401 original para a tela tratar
    } finally {
      isRefreshing = false;
    }
  }

  if (!newToken) return response;

  const retryHeaders = await buildHeaders();
  retryHeaders.set('Authorization', `Bearer ${newToken}`);
  return fetch(url, { ...rest, headers: retryHeaders });
}
