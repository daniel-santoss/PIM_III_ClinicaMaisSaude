import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { storageKeys } from '@/constants/storage';
import { apiFetch, setOnSessionExpired } from '@/lib/api';
import { autenticarBiometria, biometriaDisponivel } from '@/lib/biometria';
import { storage } from '@/lib/storage';

export interface Session {
  pacienteId: string;
  nome: string;
}

interface AuthState {
  session: Session | null;
  /** true enquanto a sessão é restaurada do storage no boot. */
  loading: boolean;
  /** true quando há sessão salva mas o app está bloqueado por biometria. */
  bloqueado: boolean;
  /** Preferência do paciente: exigir biometria ao abrir o app. */
  biometriaAtiva: boolean;
  login: (identificador: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Atualiza o nome exibido (após editar o perfil) e persiste no storage. */
  atualizarNome: (nome: string) => Promise<void>;
  /** Dispara o prompt biométrico para desbloquear o app. Retorna true em sucesso. */
  desbloquear: () => Promise<boolean>;
  /** Liga/desliga a exigência de biometria (ao ligar, confirma com o prompt). */
  definirBiometria: (ativa: boolean) => Promise<boolean>;
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
  const [bloqueado, setBloqueado] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);

  // Restaura a sessão do storage seguro no boot. Se houver sessão salva e a
  // biometria estiver ativa (e disponível no aparelho), abre bloqueado.
  useEffect(() => {
    (async () => {
      const token = await storage.get(storageKeys.authToken);
      if (token) {
        const pacienteId = (await storage.get(storageKeys.pacienteId)) ?? '';
        const nome = (await storage.get(storageKeys.nomeUsuario)) ?? '';
        setSession({ pacienteId, nome });

        const ativa = (await storage.get(storageKeys.biometriaAtiva)) === '1';
        setBiometriaAtiva(ativa);
        if (ativa && (await biometriaDisponivel())) {
          setBloqueado(true);
        }
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

    // Login por senha já prova a identidade: entra desbloqueado. Reflete a
    // preferência salva para o toggle do Perfil.
    setBiometriaAtiva((await storage.get(storageKeys.biometriaAtiva)) === '1');
    setBloqueado(false);
    setSession({ pacienteId: data.pacienteId, nome });
  }, []);

  // Desbloqueio na abertura: dispara o prompt e libera o app em caso de sucesso.
  const desbloquear = useCallback(async () => {
    const ok = await autenticarBiometria('Desbloqueie para acessar o app');
    if (ok) setBloqueado(false);
    return ok;
  }, []);

  // Liga/desliga a exigência de biometria. Ao ligar, confirma com o prompt para
  // não trancar o paciente para fora por engano.
  const definirBiometria = useCallback(async (ativa: boolean) => {
    if (ativa) {
      if (!(await biometriaDisponivel())) return false;
      const ok = await autenticarBiometria('Confirme para ativar o desbloqueio por biometria');
      if (!ok) return false;
      await storage.set(storageKeys.biometriaAtiva, '1');
      setBiometriaAtiva(true);
      return true;
    }
    await storage.remove(storageKeys.biometriaAtiva);
    setBiometriaAtiva(false);
    return true;
  }, []);

  const atualizarNome = useCallback(async (nome: string) => {
    await storage.set(storageKeys.nomeUsuario, nome);
    setSession((prev) => (prev ? { ...prev, nome } : prev));
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      storage.remove(storageKeys.authToken),
      storage.remove(storageKeys.refreshToken),
      storage.remove(storageKeys.pacienteId),
      storage.remove(storageKeys.nomeUsuario),
    ]);
    // Mantém a preferência de biometria para o próximo login neste aparelho.
    setBloqueado(false);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, loading, bloqueado, biometriaAtiva, login, logout, atualizarNome, desbloquear, definirBiometria }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
