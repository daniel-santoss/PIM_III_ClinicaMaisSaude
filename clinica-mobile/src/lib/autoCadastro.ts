import { apiFetch } from '@/lib/api';

// Auto-cadastro moderado (fluxo anônimo — Thread D / D2). O proponente busca a
// Declaração de Saúde vigente e envia o mini-cadastro + respostas. Rotas públicas → auth:false.

export type PerguntaDeclaracao = { perguntaId: string; pergunta: string; ordem: number };
export type ModeloDeclaracao = { modeloId: string; nome: string; perguntas: PerguntaDeclaracao[] };

export type RespostaItem = { perguntaId: string; resposta: boolean; detalhe?: string | null };
export type SolicitacaoPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
  temProblemaMemoria: boolean;
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

/** Envia a solicitação de auto-cadastro. Devolve a mensagem de sucesso; lança com o motivo em falha. */
export async function solicitarCadastro(payload: SolicitacaoPayload): Promise<string> {
  const res = await apiFetch('/api/AutoCadastro/solicitar', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(texto || 'Não foi possível enviar a solicitação.');
  }
  const data = (await res.json().catch(() => null)) as { mensagem?: string } | null;
  return data?.mensagem ?? 'Solicitação enviada!';
}
