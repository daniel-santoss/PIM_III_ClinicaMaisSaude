import { apiFetch } from '@/lib/api';

// Primeiro acesso do auto-cadastro moderado (Thread D / D4). O proponente APROVADO pede um código
// por e-mail, confirma com o CPF e define a senha — aí a conta é criada. Rotas públicas → auth:false.

/** Passo 1: dispara o envio do código. Resposta genérica (não lança se não elegível). */
export async function solicitarPrimeiroAcesso(identificador: string): Promise<void> {
  await apiFetch('/api/AutoCadastro/primeiro-acesso/solicitar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador }),
  });
}

/** Passo 2: confirma código + CPF e devolve o reset token de uso único. */
export async function confirmarPrimeiroAcesso(cpf: string, codigo: string): Promise<string> {
  const res = await apiFetch('/api/AutoCadastro/primeiro-acesso/confirmar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, codigo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Código inválido ou expirado.');
  }
  const data = (await res.json()) as { resetToken: string };
  return data.resetToken;
}

/** Passo 3: cria a conta definindo a senha com o reset token. */
export async function definirSenhaPrimeiroAcesso(resetToken: string, novaSenha: string): Promise<void> {
  const res = await apiFetch('/api/AutoCadastro/primeiro-acesso/definir-senha', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, novaSenha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Não foi possível concluir o primeiro acesso.');
  }
}
