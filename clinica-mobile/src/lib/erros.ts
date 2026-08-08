// Extrai a mensagem de erro do corpo ProblemDetails da API (.message/.detail/.title),
// com um texto de fallback quando não houver corpo JSON.
export async function mensagemErro(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string; detail?: string; title?: string };
    return j.message || j.detail || j.title || fallback;
  } catch {
    return fallback;
  }
}
