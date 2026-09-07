import { apiFetch } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';

// Auto-cadastro moderado (fluxo anônimo — Thread D / D2). O proponente aceita os termos,
// confirma o e-mail por código, busca a Declaração de Saúde vigente e envia o mini-cadastro
// + respostas. Rotas públicas → auth:false. Espelha o wizard do web (AutoCadastro.tsx).

export type PerguntaDeclaracao = { perguntaId: string; pergunta: string; ordem: number };
export type ModeloDeclaracao = { modeloId: string; nome: string; perguntas: PerguntaDeclaracao[] };

export type RespostaItem = { perguntaId: string; resposta: boolean; detalhe?: string | null };
export type SolicitacaoPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  temProblemaMemoria: boolean;
  aceiteTermos: boolean;
  emailVerificadoToken: string;
  modeloId: string;
  respostas: RespostaItem[];
};

/** Declaração de Saúde vigente (modelo padrão) + perguntas ordenadas. `null` se não houver modelo. */
export async function obterDeclaracao(): Promise<ModeloDeclaracao | null> {
  const res = await apiFetch('/api/AutoCadastro/declaracao', { auth: false });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Não foi possível carregar o formulário. Tente novamente.');
  return (await res.json()) as ModeloDeclaracao;
}

/** Envia (ou reenvia) o código de verificação para o e-mail informado. */
export async function solicitarVerificacaoEmail(email: string): Promise<void> {
  const res = await apiFetch('/api/AutoCadastro/verificar-email/solicitar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await mensagemErro(res, 'Não foi possível enviar o código.'));
}

/** Confirma o código e devolve o token de e-mail verificado (necessário para enviar o cadastro). */
export async function confirmarVerificacaoEmail(email: string, codigo: string): Promise<string> {
  const res = await apiFetch('/api/AutoCadastro/verificar-email/confirmar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, codigo }),
  });
  if (!res.ok) throw new Error(await mensagemErro(res, 'Código inválido ou expirado.'));
  const data = (await res.json()) as { token: string };
  return data.token;
}

/** Envia a solicitação de auto-cadastro. Devolve a mensagem de sucesso; lança com o motivo em falha. */
export async function solicitarCadastro(payload: SolicitacaoPayload): Promise<string> {
  const res = await apiFetch('/api/AutoCadastro/solicitar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await mensagemErro(res, 'Não foi possível enviar a solicitação.'));
  const data = (await res.json().catch(() => null)) as { mensagem?: string } | null;
  return data?.mensagem ?? 'Solicitação enviada!';
}
