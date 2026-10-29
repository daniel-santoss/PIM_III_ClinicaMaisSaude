// Regra única das buscas por texto do portal: só dispara a partir do 3º caractere e já diz se o
// termo é um CPF (só dígitos, com ou sem máscara) ou um nome. Assim cada busca consulta uma coluna
// só no banco: CPF por prefixo (usa o índice) e nome por "contém".

export const MIN_CARACTERES_BUSCA = 3;

export interface TermoBusca {
  tipo: "cpf" | "nome";
  /** CPF: só os dígitos; nome: o texto aparado. */
  termo: string;
}

/** Termo pronto para a API, ou null enquanto não houver caracteres suficientes (lista sem filtro). */
export function termoDeBusca(texto: string): TermoBusca | null {
  const limpo = texto.trim();
  if (/^[\d.\-\s]+$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, "");
    return digitos.length >= MIN_CARACTERES_BUSCA ? { tipo: "cpf", termo: digitos } : null;
  }
  return limpo.length >= MIN_CARACTERES_BUSCA ? { tipo: "nome", termo: limpo } : null;
}

/** Texto de ajuda enquanto o usuário digitou menos que o mínimo (vazio quando não se aplica). */
export function avisoBuscaCurta(texto: string): string {
  const limpo = texto.trim();
  return limpo.length > 0 && !termoDeBusca(limpo) ? `Digite ao menos ${MIN_CARACTERES_BUSCA} caracteres para buscar.` : "";
}
