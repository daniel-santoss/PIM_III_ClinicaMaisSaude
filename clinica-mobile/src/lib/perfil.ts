import { apiFetch } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';
import type { DadosPerfilInput, PacientePerfil } from '@/types/perfil';

// Lê o perfil completo do paciente. Usamos GET /api/Pacientes/{id} (e não
// GET /api/Perfil) porque só ele traz `temProblemaMemoria` e o `id`.
export async function obterPerfil(pacienteId: string): Promise<PacientePerfil> {
  const res = await apiFetch(`/api/Pacientes/${pacienteId}`);
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível carregar seu perfil.'));
  }
  return (await res.json()) as PacientePerfil;
}

// Atualiza nome/email/telefone via PATCH /api/Perfil (self-service). Esta rota
// NÃO expõe `temProblemaMemoria` — por design o paciente não edita esse dado
// clínico (que alimenta o cálculo de risco de falta).
export async function atualizarDados(input: DadosPerfilInput): Promise<void> {
  const res = await apiFetch('/api/Perfil', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível salvar seus dados.'));
  }
}

// Troca a senha do usuário logado. O backend valida a senha atual.
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const res = await apiFetch('/api/Perfil/senha', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível alterar a senha.'));
  }
}

// Faz upload da foto de perfil (multipart, campo "foto"). Não definimos
// Content-Type manualmente: o fetch do RN gera o boundary do multipart.
// Backend aceita image/jpeg|png|webp até 2 MB e devolve o novo fotoBase64.
export async function enviarFoto(uri: string, mimeType?: string): Promise<string | null> {
  const tipo = mimeType ?? 'image/jpeg';
  const ext = tipo.split('/')[1] ?? 'jpg';
  const form = new FormData();
  form.append('foto', {
    uri,
    name: `perfil.${ext}`,
    type: tipo,
  } as unknown as Blob);

  const res = await apiFetch('/api/Perfil/foto', { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(await mensagemErro(res, 'Não foi possível enviar a foto.'));
  }
  const data = (await res.json()) as { fotoBase64?: string };
  return data.fotoBase64 ?? null;
}
