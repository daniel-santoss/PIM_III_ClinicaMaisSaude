import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import {
  ClipboardList, Plus, Star, Lock, Trash2, Pencil, ChevronUp, ChevronDown,
  Check, X, FileText, ListChecks,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

type ModeloResumo = {
  id: string;
  nome: string;
  modeloPadrao: boolean;
  qtdPerguntas: number;
  possuiSolicitacoes: boolean;
  dtCriado: string;
};
type PerguntaAdmin = { id: string; pergunta: string; ordem: number };
type ModeloDetalhe = {
  id: string;
  nome: string;
  modeloPadrao: boolean;
  possuiSolicitacoes: boolean;
  perguntas: PerguntaAdmin[];
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json",
});

export default function DeclaracaoSaudeEditor() {
  const toast = useToast();
  const [modelos, setModelos] = useState<ModeloResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ModeloDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  // criação de modelo
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  // edição de nome do modelo
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");

  // perguntas
  const [novaPergunta, setNovaPergunta] = useState("");
  const [editandoPerguntaId, setEditandoPerguntaId] = useState<string | null>(null);
  const [perguntaEdit, setPerguntaEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

  // confirmações
  const [confirmExcluirModelo, setConfirmExcluirModelo] = useState(false);
  const [confirmExcluirPergunta, setConfirmExcluirPergunta] = useState<PerguntaAdmin | null>(null);

  const carregarModelos = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar modelos."); return; }
      const data: ModeloResumo[] = await res.json();
      setModelos(data);
      // Seleciona o primeiro só se nada estiver selecionado (o efeito carrega o detalhe).
      setSelecionadoId(prev => prev ?? data[0]?.id ?? null);
    } catch {
      toast.error("Erro de conexão ao carregar modelos.");
    } finally {
      setCarregando(false);
    }
  };

  const carregarDetalhe = async (id: string) => {
    setCarregandoDetalhe(true);
    setEditandoNome(false);
    setEditandoPerguntaId(null);
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${id}`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar o modelo."); return; }
      setDetalhe(await res.json());
    } catch {
      toast.error("Erro de conexão ao carregar o modelo.");
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  useEffect(() => { carregarModelos(); }, []);
  useEffect(() => { if (selecionadoId) carregarDetalhe(selecionadoId); }, [selecionadoId]);

  const travado = detalhe?.possuiSolicitacoes ?? false;

  // ── Ações de modelo ─────────────────────────────────────────────────────────
  const criarModelo = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ nome, definirComoPadrao: false }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      const criado: ModeloDetalhe = await res.json();
      setNovoNome(""); setCriando(false);
      toast.success("Modelo criado.");
      await carregarModelos();
      setSelecionadoId(criado.id);
    } catch { toast.error("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  const renomearModelo = async () => {
    if (!detalhe) return;
    const nome = nomeEdit.trim();
    if (!nome) return;
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${detalhe.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ nome }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      setDetalhe({ ...detalhe, nome });
      setModelos(prev => prev.map(m => m.id === detalhe.id ? { ...m, nome } : m));
      setEditandoNome(false);
      toast.success("Modelo renomeado.");
    } catch { toast.error("Erro de conexão."); }
  };

  const definirPadrao = async () => {
    if (!detalhe) return;
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${detalhe.id}/definir-padrao`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success("Modelo definido como vigente.");
      await carregarModelos();
      setDetalhe({ ...detalhe, modeloPadrao: true });
    } catch { toast.error("Erro de conexão."); }
  };

  const excluirModelo = async () => {
    if (!detalhe) return;
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${detalhe.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success("Modelo excluído.");
      setConfirmExcluirModelo(false);
      setDetalhe(null); setSelecionadoId(null);
      await carregarModelos();
    } catch { toast.error("Erro de conexão."); }
  };

  // ── Ações de pergunta ───────────────────────────────────────────────────────
  const adicionarPergunta = async () => {
    if (!detalhe) return;
    const pergunta = novaPergunta.trim();
    if (!pergunta) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${detalhe.id}/perguntas`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ pergunta }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      const criada: PerguntaAdmin = await res.json();
      setDetalhe({ ...detalhe, perguntas: [...detalhe.perguntas, criada] });
      setModelos(prev => prev.map(m => m.id === detalhe.id ? { ...m, qtdPerguntas: m.qtdPerguntas + 1 } : m));
      setNovaPergunta("");
    } catch { toast.error("Erro de conexão."); }
    finally { setSalvando(false); }
  };

  const salvarEdicaoPergunta = async (p: PerguntaAdmin) => {
    if (!detalhe) return;
    const pergunta = perguntaEdit.trim();
    if (!pergunta) return;
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/perguntas/${p.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ pergunta }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      setDetalhe({ ...detalhe, perguntas: detalhe.perguntas.map(x => x.id === p.id ? { ...x, pergunta } : x) });
      setEditandoPerguntaId(null);
    } catch { toast.error("Erro de conexão."); }
  };

  const excluirPergunta = async (p: PerguntaAdmin) => {
    if (!detalhe) return;
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/perguntas/${p.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      setDetalhe({ ...detalhe, perguntas: detalhe.perguntas.filter(x => x.id !== p.id) });
      setModelos(prev => prev.map(m => m.id === detalhe.id ? { ...m, qtdPerguntas: Math.max(0, m.qtdPerguntas - 1) } : m));
      setConfirmExcluirPergunta(null);
    } catch { toast.error("Erro de conexão."); }
  };

  const mover = async (index: number, dir: -1 | 1) => {
    if (!detalhe) return;
    const alvo = index + dir;
    if (alvo < 0 || alvo >= detalhe.perguntas.length) return;
    const nova = [...detalhe.perguntas];
    [nova[index], nova[alvo]] = [nova[alvo], nova[index]];
    const reordenada = nova.map((p, i) => ({ ...p, ordem: i + 1 }));
    setDetalhe({ ...detalhe, perguntas: reordenada }); // otimista
    try {
      const res = await fetch(`${API_URL}/api/DeclaracaoSaude/modelos/${detalhe.id}/perguntas/ordem`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(reordenada.map(p => p.id)),
      });
      if (!res.ok) { toast.error(await res.text()); carregarDetalhe(detalhe.id); }
    } catch { toast.error("Erro de conexão."); carregarDetalhe(detalhe.id); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="bg-white border border-line rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 shrink-0 rounded-lg grid place-items-center bg-brand-50 text-brand-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="mr-auto min-w-0">
            <h2 className="font-semibold text-base text-ink">Declaração de Saúde</h2>
            <p className="text-[13px] text-muted mt-0.5">Gerencie os modelos e perguntas respondidos no auto-cadastro.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => { setCriando(true); setNovoNome(""); }}>
            Novo modelo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* ── Lista de modelos ── */}
          <div className="flex flex-col gap-3">
            {criando && (
              <div className="bg-white border border-brand-600 rounded-lg p-3 flex flex-col gap-2">
                <input
                  autoFocus value={novoNome} onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") criarModelo(); if (e.key === "Escape") setCriando(false); }}
                  placeholder="Nome do modelo…"
                  className="h-9 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={criarModelo} disabled={salvando || !novoNome.trim()}>Criar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setCriando(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {carregando ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
              </div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-10 bg-white border border-line rounded-lg px-4">
                <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-body font-medium">Nenhum modelo</p>
                <p className="text-muted text-[13px] mt-0.5">Crie o primeiro modelo de DS.</p>
              </div>
            ) : (
              modelos.map(m => {
                const ativo = m.id === selecionadoId;
                return (
                  <button
                    key={m.id} onClick={() => setSelecionadoId(m.id)}
                    className={`text-left bg-white border rounded-lg px-4 py-3 transition-colors ${
                      ativo ? "border-brand-600 ring-1 ring-brand-600" : "border-line hover:bg-canvas"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink truncate">{m.nome}</span>
                      {m.modeloPadrao && <Badge variant="success">Vigente</Badge>}
                      {m.possuiSolicitacoes && (
                        <span title="Já usado em solicitações" className="text-muted"><Lock className="w-3.5 h-3.5" /></span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted mt-1 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" /> {m.qtdPerguntas} pergunta{m.qtdPerguntas === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ── Editor do modelo selecionado ── */}
          <div className="bg-white border border-line rounded-lg min-h-[300px]">
            {!detalhe || carregandoDetalhe ? (
              <div className="flex justify-center items-center py-24">
                {carregandoDetalhe
                  ? <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
                  : <p className="text-muted text-sm">Selecione um modelo para editar.</p>}
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Cabeçalho do modelo */}
                <div className="px-5 py-4 border-b border-line flex items-center gap-3 flex-wrap">
                  {editandoNome ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        autoFocus value={nomeEdit} onChange={e => setNomeEdit(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") renomearModelo(); if (e.key === "Escape") setEditandoNome(false); }}
                        className="h-9 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus flex-1 min-w-0"
                      />
                      <button onClick={renomearModelo} className="text-success p-1.5 hover:bg-success-tint rounded-md"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditandoNome(false)} className="text-muted p-1.5 hover:bg-canvas rounded-md"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mr-auto min-w-0">
                      <h3 className="font-semibold text-base text-ink truncate">{detalhe.nome}</h3>
                      {detalhe.modeloPadrao && <Badge variant="success">Vigente</Badge>}
                      <button
                        onClick={() => { setNomeEdit(detalhe.nome); setEditandoNome(true); }}
                        title="Renomear" className="text-muted p-1.5 hover:bg-canvas rounded-md"
                      ><Pencil className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {!detalhe.modeloPadrao && (
                      <Button size="sm" variant="outline" icon={<Star size={14} />}
                        onClick={definirPadrao} disabled={detalhe.perguntas.length === 0}
                        title={detalhe.perguntas.length === 0 ? "Adicione perguntas primeiro" : "Tornar este o modelo vigente"}
                      >Definir vigente</Button>
                    )}
                    <Button size="sm" variant="danger" icon={<Trash2 size={14} />}
                      onClick={() => setConfirmExcluirModelo(true)}
                      disabled={detalhe.modeloPadrao || travado}
                      title={detalhe.modeloPadrao ? "Defina outro como vigente antes" : travado ? "Modelo em uso" : "Excluir modelo"}
                    >Excluir</Button>
                  </div>
                </div>

                {/* Aviso de travado */}
                {travado && (
                  <div className="mx-5 mt-4 flex items-start gap-2.5 bg-warning-tint border border-warning-border rounded-md px-3.5 py-2.5">
                    <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-[13px] text-warning-text leading-relaxed">
                      Este modelo já foi usado em solicitações e não pode ser alterado (integridade das respostas).
                      Para mudar a declaração, crie um novo modelo e defina-o como vigente.
                    </p>
                  </div>
                )}

                {/* Perguntas */}
                <div className="p-5 flex flex-col gap-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Perguntas ({detalhe.perguntas.length})
                  </div>

                  {detalhe.perguntas.length === 0 && (
                    <p className="text-sm text-muted py-4 text-center">Nenhuma pergunta ainda.</p>
                  )}

                  {detalhe.perguntas.map((p, index) => (
                    <div key={p.id} className="flex items-center gap-2.5 bg-canvas border border-line rounded-md px-3 py-2.5">
                      <span className="w-6 h-6 shrink-0 grid place-items-center rounded bg-white border border-line text-[12px] font-semibold text-muted">
                        {index + 1}
                      </span>
                      {editandoPerguntaId === p.id ? (
                        <>
                          <input
                            autoFocus value={perguntaEdit} onChange={e => setPerguntaEdit(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") salvarEdicaoPergunta(p); if (e.key === "Escape") setEditandoPerguntaId(null); }}
                            className="flex-1 min-w-0 h-9 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus"
                          />
                          <button onClick={() => salvarEdicaoPergunta(p)} className="text-success p-1.5 hover:bg-success-tint rounded-md"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditandoPerguntaId(null)} className="text-muted p-1.5 hover:bg-white rounded-md"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 min-w-0 text-sm text-ink break-words">{p.pergunta}</span>
                          {!travado && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => mover(index, -1)} disabled={index === 0}
                                className="text-muted p-1.5 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed" title="Subir"><ChevronUp className="w-4 h-4" /></button>
                              <button onClick={() => mover(index, 1)} disabled={index === detalhe.perguntas.length - 1}
                                className="text-muted p-1.5 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed" title="Descer"><ChevronDown className="w-4 h-4" /></button>
                              <button onClick={() => { setEditandoPerguntaId(p.id); setPerguntaEdit(p.pergunta); }}
                                className="text-muted p-1.5 hover:bg-white rounded-md" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setConfirmExcluirPergunta(p)}
                                className="text-danger p-1.5 hover:bg-danger-tint rounded-md" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Adicionar pergunta */}
                  {!travado && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        value={novaPergunta} onChange={e => setNovaPergunta(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") adicionarPergunta(); }}
                        placeholder="Nova pergunta…"
                        className="flex-1 min-w-0 h-10 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted"
                      />
                      <Button size="sm" icon={<Plus size={15} />} onClick={adicionarPergunta} disabled={salvando || !novaPergunta.trim()}>
                        Adicionar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmExcluirModelo}
        title="Excluir modelo"
        description={`Excluir o modelo "${detalhe?.nome}" e todas as suas perguntas? Esta ação não pode ser desfeita.`}
        confirmText="Excluir" cancelText="Cancelar" type="destructive"
        onConfirm={excluirModelo} onCancel={() => setConfirmExcluirModelo(false)}
      />
      <ConfirmModal
        isOpen={!!confirmExcluirPergunta}
        title="Excluir pergunta"
        description={confirmExcluirPergunta ? `Excluir a pergunta "${confirmExcluirPergunta.pergunta}"?` : ""}
        confirmText="Excluir" cancelText="Cancelar" type="destructive"
        onConfirm={() => confirmExcluirPergunta && excluirPergunta(confirmExcluirPergunta)}
        onCancel={() => setConfirmExcluirPergunta(null)}
      />
    </>
  );
}
