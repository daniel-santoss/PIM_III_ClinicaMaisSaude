import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { storageKeys } from '@/constants/storage';
import { apiFetch, setOnSessionExpired } from '@/lib/api';
import { storage } from '@/lib/storage';

export interface Session {
  pacienteId: string;
  nome: string;
}

interface AuthState {
  session: Session | null;
  /** true enquanto a sessão é restaurada do storage no boot. */
  loading: boolean;
  login: (identificador: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function extrairErro(res: Response): Promise<string> {
  // O backend responde ProblemDetails (JSON) com .message/.detail/.title.
  try {
    const j = (await res.json()) as { message?: string; detail?: string; title?: string };
    return j.message || j.detail || j.title || 'Credenciais inválidas.';
  } catch {
    return 'Credenciais inválidas.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura a sessão do storage seguro no boot.
  useEffect(() => {
    (async () => {
      const token = await storage.get(storageKeys.authToken);
      if (token) {
        const pacienteId = (await storage.get(storageKeys.pacienteId)) ?? '';
        const nome = (await storage.get(storageKeys.nomeUsuario)) ?? '';
        setSession({ pacienteId, nome });
      }
      setLoading(false);
    })();
  }, []);

  // Quando o apiFetch não consegue renovar o token (refresh falhou), ele chama
  // este callback → derrubamos a sessão e a navegação redireciona ao login.
  useEffect(() => {
    setOnSessionExpired(() => setSession(null));
    return () => setOnSessionExpired(null);
  }, []);

  const login = useCallback(async (identificador: string, senha: string) => {
    const res = await apiFetch('/api/Auth/login', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador, senha }),
    });

    if (!res.ok) {
      throw new Error(await extrairErro(res));
    }

    const data = (await res.json()) as {
      token: string;
      refreshToken?: string;
      pacienteId?: string;
      nome?: string;
      Nome?: string;
    };

    // App exclusivo para pacientes: sem pacienteId, não é um paciente.
    if (!data.pacienteId) {
      throw new Error('Este aplicativo é exclusivo para pacientes.');
    }

    const nome = data.nome || data.Nome || '';
    await storage.set(storageKeys.authToken, data.token);
    if (data.refreshToken) await storage.set(storageKeys.refreshToken, data.refreshToken);
    await storage.set(storageKeys.pacienteId, data.pacienteId);
    if (nome) await storage.set(storageKeys.nomeUsuario, nome);

    setSession({ pacienteId: data.pacienteId, nome });
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      storage.remove(storageKeys.authToken),
      storage.remove(storageKeys.refreshToken),
      storage.remove(storageKeys.pacienteId),
      storage.remove(storageKeys.nomeUsuario),
    ]);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
