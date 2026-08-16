import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renderiza o conteúdo (overlay + diálogo) diretamente no <body>, fora da
 * árvore da aplicação. Sem isso, um ancestral com transform/animate-in ou a
 * sidebar/topbar fixas (z alto) podem "prender" o overlay `fixed inset-0`,
 * fazendo a opacidade não cobrir a tela inteira. No body, o overlay sempre
 * ocupa 100% da viewport e fica acima de todo o shell.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
