import { avisoBuscaCurta } from "../../utils/busca";

// Dica sob um campo de busca enquanto o texto tem menos de 3 caracteres. Fica posicionada
// (absolute) para não empurrar o layout; o pai do campo precisa ser "relative".
export default function AvisoBusca({ texto }: { texto: string }) {
  const aviso = avisoBuscaCurta(texto);
  if (!aviso) return null;
  return <p className="absolute left-0 top-full mt-1 text-[11px] text-muted whitespace-nowrap z-10">{aviso}</p>;
}
