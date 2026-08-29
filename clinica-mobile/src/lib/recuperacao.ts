import { apiFetch } from '@/lib/api';

// Autoatendimento de recuperação de senha (3 passos). Rotas anônimas → auth:false
// (não anexa Bearer nem dispara o refresh em 401).

/** Passo 1: dispara o envio do código. Resposta é sempre genérica (não lança em conta inexistente). */
export async function solicitarRecuperacao(identificador: string): Promise<void> {
  await apiFetch('/api/Auth/recuperar-senha/solicitar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador }),
  });
}

/** Passo 2: valida o código e devolve o reset token de uso único. */
export async function validarCodigo(identificador: string, codigo: string): Promise<string> {
  const res = await apiFetch('/api/Auth/recuperar-senha/validar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador, codigo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Código inválido ou expirado.');
  }
  const data = (await res.json()) as { resetToken: string };
  return data.resetToken;
}

/** Passo 3: redefine a senha usando o reset token. */
export async function redefinirSenha(resetToken: string, novaSenha: string): Promise<void> {
  const res = await apiFetch('/api/Auth/recuperar-senha/redefinir', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, novaSenha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Não foi possível redefinir a senha.');
  }
}
