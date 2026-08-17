import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { listarNotificacoes } from '@/lib/notificacoes';

interface NaoLidasState {
  /** Quantidade de notificações não lidas (fonte única para o badge da aba Avisos). */
  naoLidas: number;
  /** Busca a lista e recalcula a contagem (chamado no boot e ao focar telas). */
  atualizar: () => Promise<void>;
  /** Define a contagem diretamente — usado pela tela de Avisos, que já tem a lista em mãos. */
  definir: (n: number) => void;
}

const NaoLidasContext = createContext<NaoLidasState | undefined>(undefined);

export function NaoLidasProvider({ children }: { children: ReactNode }) {
  const [naoLidas, setNaoLidas] = useState(0);

  const atualizar = useCallback(async () => {
    try {
      const lista = await listarNotificacoes();
      setNaoLidas(lista.filter((n) => !n.lida).length);
    } catch {
      // Badge é acessório: falha de rede não deve estourar. Mantém o valor atual.
    }
  }, []);

  // Carrega a contagem já no boot do grupo protegido, antes de o paciente abrir Avisos.
  useEffect(() => {
    atualizar();
  }, [atualizar]);

  return (
    <NaoLidasContext.Provider value={{ naoLidas, atualizar, definir: setNaoLidas }}>
      {children}
    </NaoLidasContext.Provider>
  );
}

export function useNaoLidas(): NaoLidasState {
  const ctx = useContext(NaoLidasContext);
  if (!ctx) throw new Error('useNaoLidas deve ser usado dentro de <NaoLidasProvider>.');
  return ctx;
}
