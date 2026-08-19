import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

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
  /** Preferência do paciente: exigir biometria ao abrir o app (app-lock). */
  biometriaAtiva: boolean;
  /** Preferência "Lembrar usuário": manter identificador/nome após o logout. */
  lembrarUsuario: boolean;
  /** Identificador (CPF/e-mail) lembrado para pré-preencher o login. */
  identificadorLembrado: string;
  /** Nome lembrado, para o login mostrar "Olá, Fulano". */
  nomeLembrado: string;
  login: (identificador: string, senha: string, lembrar: boolean) => Promise<void>;
  /** esquecer=true apaga também o usuário lembrado (deleção de conta, ban). */
  logout: (esquecer?: boolean) => Promise<void>;
  /** Esquece o usuário lembrado para entrar com outra conta (mantém a preferência). */
  trocarUsuario: () => Promise<void>;
  /** Atualiza o nome exibido (após editar o perfil) e persiste no storage. */
  atualizarNome: (nome: string) => Promise<void>;
  /** Dispara o prompt biométrico para desbloquear o app (app-lock). Retorna true em sucesso. */
  desbloquear: () => Promise<boolean>;
  /** Desbloqueia a tela de bloqueio revalidando a senha no servidor. Retorna true em sucesso. */
  desbloquearComSenha: (senha: string) => Promise<boolean>;
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

interface LoginData {
  token: string;
  refreshToken?: string;
  pacienteId?: string;
  nome?: string;
  Nome?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [lembrarUsuario, setLembrarUsuario] = useState(true);
  const [identificadorLembrado, setIdentificadorLembrado] = useState('');
  const [nomeLembrado, setNomeLembrado] = useState('');

  // Chama o endpoint de login e persiste tokens + identidade. Guarda o
  // identificador (usado pelo desbloqueio por senha durante a sessão).
  const autenticar = useCallback(async (identificador: string, senha: string): Promise<Session> => {
    const res = await apiFetch('/api/Auth/login', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador, senha }),
    });
    if (!res.ok) throw new Error(await extrairErro(res));

    const data = (await res.json()) as LoginData;

    // App exclusivo para pacientes: sem pacienteId, não é um paciente.
    if (!data.pacienteId) throw new Error('Este aplicativo é exclusivo para pacientes.');

    const nome = data.nome || data.Nome || '';
    await storage.set(storageKeys.authToken, data.token);
    if (data.refreshToken) await storage.set(storageKeys.refreshToken, data.refreshToken);
    await storage.set(storageKeys.pacienteId, data.pacienteId);
    if (nome) await storage.set(storageKeys.nomeUsuario, nome);
    await storage.set(storageKeys.contaIdentificador, identificador);

    return { pacienteId: data.pacienteId, nome };
  }, []);

  // Restaura o estado no boot. Com sessão salva → entra (bloqueado se a
  // biometria estiver ligada). Sem sessão → carrega o usuário lembrado para o
  // login pré-preencher (se a preferência não foi desligada).
  useEffect(() => {
    (async () => {
      const ativa = (await storage.get(storageKeys.biometriaAtiva)) === '1';
      setBiometriaAtiva(ativa);

      const lembrar = (await storage.get(storageKeys.lembrarUsuario)) !== '0'; // padrão: lembrar
      setLembrarUsuario(lembrar);

      const token = await storage.get(storageKeys.authToken);
      if (token) {
        const pacienteId = (await storage.get(storageKeys.pacienteId)) ?? '';
        const nome = (await storage.get(storageKeys.nomeUsuario)) ?? '';
        setSession({ pacienteId, nome });
        if (ativa && (await biometriaDisponivel())) setBloqueado(true);
      } else if (lembrar) {
        setIdentificadorLembrado((await storage.get(storageKeys.contaIdentificador)) ?? '');
        setNomeLembrado((await storage.get(storageKeys.nomeUsuario)) ?? '');
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

  // Re-tranca o app quando ele vai para segundo plano (com sessão + biometria
  // ligada). Assim, ao voltar do background — não só no cold boot — a tela de
  // bloqueio já está no ar e dispara a biometria. Trava só em 'background' (não
  // 'inactive') para não conflitar com o próprio prompt biométrico.
  useEffect(() => {
    if (!session || !biometriaAtiva) return;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') setBloqueado(true);
    });
    return () => sub.remove();
  }, [session, biometriaAtiva]);

  const login = useCallback(
    async (identificador: string, senha: string, lembrar: boolean) => {
      const ident = identificador.trim();
      const nova = await autenticar(ident, senha);

      await storage.set(storageKeys.lembrarUsuario, lembrar ? '1' : '0');
      setLembrarUsuario(lembrar);
      setIdentificadorLembrado(lembrar ? ident : '');
      setNomeLembrado(lembrar ? nova.nome : '');

      setBiometriaAtiva((await storage.get(storageKeys.biometriaAtiva)) === '1');
      setBloqueado(false);
      setSession(nova);
    },
    [autenticar],
  );

  // Desbloqueio na abertura (app-lock): dispara o prompt e libera o app.
  const desbloquear = useCallback(async () => {
    const ok = await autenticarBiometria('Desbloqueie para acessar o app');
    if (ok) setBloqueado(false);
    return ok;
  }, []);

  // Desbloqueio alternativo por senha: revalida no servidor (e renova os tokens).
  const desbloquearComSenha = useCallback(
    async (senha: string) => {
      const ident = await storage.get(storageKeys.contaIdentificador);
      if (!ident) return false; // sem identificador salvo; usar biometria/sair
      try {
        const nova = await autenticar(ident, senha);
        setBloqueado(false);
        setSession(nova);
        return true;
      } catch {
        return false;
      }
    },
    [autenticar],
  );

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

  // Logout real: sempre encerra a sessão. Mantém o usuário lembrado (identificador
  // + nome) se a preferência estiver ligada — o login pedirá só a senha. Com
  // esquecer=true, apaga tudo (conta excluída, ban).
  const logout = useCallback(async (esquecer = false) => {
    const lembrar = !esquecer && (await storage.get(storageKeys.lembrarUsuario)) !== '0';

    await Promise.all([
      storage.remove(storageKeys.authToken),
      storage.remove(storageKeys.refreshToken),
      storage.remove(storageKeys.pacienteId),
    ]);

    if (lembrar) {
      setIdentificadorLembrado((await storage.get(storageKeys.contaIdentificador)) ?? '');
      setNomeLembrado((await storage.get(storageKeys.nomeUsuario)) ?? '');
    } else {
      await Promise.all([
        storage.remove(storageKeys.contaIdentificador),
        storage.remove(storageKeys.nomeUsuario),
        storage.remove(storageKeys.lembrarUsuario),
      ]);
      setIdentificadorLembrado('');
      setNomeLembrado('');
      setLembrarUsuario(true); // volta ao padrão
    }

    setBloqueado(false);
    setSession(null);
  }, []);

  // Esquece só o usuário lembrado (para entrar com outra conta), preservando a
  // preferência de lembrar — o próximo login re-lembra a nova conta.
  const trocarUsuario = useCallback(async () => {
    await Promise.all([
      storage.remove(storageKeys.contaIdentificador),
      storage.remove(storageKeys.nomeUsuario),
    ]);
    setIdentificadorLembrado('');
    setNomeLembrado('');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        bloqueado,
        biometriaAtiva,
        lembrarUsuario,
        identificadorLembrado,
        nomeLembrado,
        login,
        logout,
        trocarUsuario,
        atualizarNome,
        desbloquear,
        desbloquearComSenha,
        definirBiometria,
      }}
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
