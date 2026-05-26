export type ToastType = "success" | "error" | "warning";

function formatErrorMessage(message: string): string {
  if (typeof message !== 'string') return String(message);

  const trimmed = message.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      
      // 1. Caso seja o ProblemDetails do ASP.NET Core (RFC 7807 / RFC 9110)
      // Exemplo: {"errors":{"Observacao":["A observação deve ter pelo menos 5 caracteres."]}}
      if (parsed.errors && typeof parsed.errors === 'object') {
        const errorMessages: string[] = [];
        for (const [, value] of Object.entries(parsed.errors)) {
          if (Array.isArray(value)) {
            errorMessages.push(...value);
          } else if (typeof value === 'string') {
            errorMessages.push(value);
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join(" ");
        }
      }
      
      // 2. Caso seja um JSON customizado com campo "mensagem" ou "message"
      if (parsed.mensagem && typeof parsed.mensagem === 'string') {
        return parsed.mensagem;
      }
      if (parsed.message && typeof parsed.message === 'string') {
        return parsed.message;
      }

      // 3. Caso seja um JSON genérico com campo "title"
      if (parsed.title && typeof parsed.title === 'string') {
        return parsed.title;
      }
    } catch (e) {
      // Falha ao fazer parse, retorna a mensagem original
    }
  }
  return message;
}

export function useToast() {
  const showToast = (message: string, type: ToastType) => {
    const formattedMessage = formatErrorMessage(message);
    window.dispatchEvent(new CustomEvent('addToast', { detail: { message: formattedMessage, type } }));
  };

  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
  };
}
