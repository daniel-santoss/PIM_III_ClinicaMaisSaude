import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import {
  Inbox, Search, RefreshCw, Check, X, Brain, Mail, Phone, UserCheck, ChevronDown, ClipboardList, History, RotateCcw,
} from "lucide-react";
import { getRealDate } from "../utils/dates";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";
import ModalPortal from "../components/ui/ModalPortal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Paginacao from "../components/ui/Paginacao";

type RespostaItem = { pergunta: string; ordem: number; resposta: boolean; detalhe: string | null };
type Solicitacao = {
  solicitacaoId: string;
  dtCriado: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  temProblemaMemoria: boolean;
  respostas: RespostaItem[];
  status: StatusSolicitacao;
  motivoRecusa: string | null;
  decididaEm: string | null;
  decididaPor: string | null;
  podeRetificar: boolean;
  motivoNaoRetificavel: string | null;
  historico: HistoricoItem[];
};
type HistoricoItem = { statusAnterior: StatusSolicitacao; statusNovo: StatusSolicitacao; motivo: string | null; realizadoPor: string | null; dt: string };
type StatusSolicitacao = "EmAnalise" | "Aprovada" | "Recusada";
type PaginaSolicitacoes = {
  items: Solicitacao[];
  totalCount: number;
  totalPages: number;
  totalEmAnalise: number;
  totalRequerApoio: number;
  totalAprovadas: number;
  totalRecusadas: number;
};

const ROTULO_STATUS: Record<StatusSolicitacao, string> = {
  EmAnalise: "Em análise",
  Aprovada: "Aprovada",
  Recusada: "Recusada",
};

const formatarDataHora = (iso: string) =>
  getRealDate(iso, true)!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const TAMANHO_PAGINA = 10;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json",
});

const getInitials = (nome: string) =>
  nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

export default function SolicitacoesCadastroList() {
  const toast = useToast();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  // Aba = status listado. Decididas ficam consultáveis (e retificáveis) em vez de sumirem.
  const [aba, setAba] = useState<StatusSolicitacao>("EmAnalise");
  const [totais, setTotais] = useState({ filtrado: 0, paginas: 1, emAnalise: 0, requerApoio: 0, aprovadas: 0, recusadas: 0 });
  const [historicoAberto, setHistoricoAberto] = useState<Record<string, boolean>>({});
  // Declaração de saúde recolhida por padrão; abre por solicitação.
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const [processando, setProcessando] = useState<Record<string, boolean>>({});

  const [aprovarAlvo, setAprovarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [recusarAlvo, setRecusarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [retificarAlvo, setRetificarAlvo] = useState<{ id: string; nome: string; status: StatusSolicitacao } | null>(null);
  const [motivo, setMotivo] = useState("");

  const carregar = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ status: aba, page: String(pagina), pageSize: String(TAMANHO_PAGINA) });
      if (buscaAplicada) params.set("busca", buscaAplicada);
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes?${params}`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar solicitações."); return; }
      const dados: PaginaSolicitacoes = await res.json();
      // A página ficou vazia (ex.: aprovou o último item dela): volta uma.
      if (dados.items.length === 0 && pagina > 1) { setPagina(p => p - 1); return; }
      setSolicitacoes(dados.items);
      setTotais({
        filtrado: dados.totalCount,
        paginas: Math.max(1, dados.totalPages),
        emAnalise: dados.totalEmAnalise,
        requerApoio: dados.totalRequerApoio,
        aprovadas: dados.totalAprovadas,
        recusadas: dados.totalRecusadas,
      });
    } catch {
      toast.error("Erro de conexão ao carregar solicitações.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [pagina, buscaAplicada, aba]);

  const trocarAba = (nova: StatusSolicitacao) => { setAba(nova); setPagina(1); };

  // Busca no servidor com debounce; nova busca volta para a 1ª página.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  const aprovar = async (id: string) => {
    setProcessando(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes/${id}/aprovar`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      await carregar();
      toast.success("Solicitação aprovada. O proponente foi avisado por e-mail.");
    } catch {
      toast.error("Erro de conexão ao aprovar.");
    } finally {
      setProcessando(p => ({ ...p, [id]: false }));
      setAprovarAlvo(null);
    }
  };

  const retificar = async (id: string, motivoTexto: string) => {
    setProcessando(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes/${id}/retificar`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ motivo: motivoTexto }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      const { mensagem } = await res.json();
      await carregar();
      toast.success(mensagem);
      setRetificarAlvo(null);
      setMotivo("");
    } catch {
      toast.error("Erro de conexão ao retificar.");
    } finally {
      setProcessando(p => ({ ...p, [id]: false }));
    }
  };

  const recusar = async (id: string, motivoTexto: string) => {
    setProcessando(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes/${id}/recusar`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ motivo: motivoTexto }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      await carregar();
      toast.success("Solicitação recusada. O proponente foi avisado por e-mail.");
      setRecusarAlvo(null);
      setMotivo("");
    } catch {
      toast.error("Erro de conexão ao recusar.");
    } finally {
      setProcessando(p => ({ ...p, [id]: false }));
    }
  };


  return (
    <>
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="bg-white border border-line rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 shrink-0 rounded-lg grid place-items-center bg-brand-50 text-brand-600">
            <Inbox className="w-5 h-5" />
          </div>
          <div className="mr-auto min-w-0">
            <h2 className="font-semibold text-base text-ink">Solicitações de cadastro</h2>
            <p className="text-[13px] text-muted mt-0.5">Avalie os auto-cadastros e aprove ou recuse após a avaliação presencial.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text" placeholder="Buscar por nome ou CPF..." value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 h-10 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted"
            />
          </div>
          <button
            onClick={carregar}
            className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-[15px] h-[15px]" /> Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-lg px-4 py-[11px]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-brand-50 text-brand-600">
                <Inbox className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Em análise</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-ink">{totais.emAnalise}</div>
          </div>
          <div className="bg-white border border-line rounded-lg px-4 py-[11px]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-warning-tint text-warning">
                <Brain className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Requer apoio (memória)</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-warning-text">{totais.requerApoio}</div>
          </div>
        </div>

        {/* Abas por status */}
        <div role="tablist" aria-label="Status das solicitações" className="flex gap-1 border-b border-line">
          {([
            ["EmAnalise", totais.emAnalise],
            ["Aprovada", totais.aprovadas],
            ["Recusada", totais.recusadas],
          ] as [StatusSolicitacao, number][]).map(([st, qtd]) => (
            <button
              key={st}
              role="tab"
              aria-selected={aba === st}
              onClick={() => trocarAba(st)}
              className={`h-10 px-4 -mb-px text-[13px] font-semibold border-b-2 transition-colors ${
                aba === st ? "border-brand-600 text-brand-600" : "border-transparent text-muted hover:text-body"
              }`}
            >
              {st === "EmAnalise" ? "Em análise" : st === "Aprovada" ? "Aprovadas" : "Recusadas"}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[11px] ${aba === st ? "bg-brand-50" : "bg-canvas"}`}>{qtd}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {carregando ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="text-center py-16 bg-white border border-line rounded-lg">
            <UserCheck className="w-10 h-10 text-muted mx-auto mb-3" />
            <h3 className="text-base font-semibold text-body">
              {buscaAplicada
                ? "Nenhuma solicitação encontrada"
                : aba === "EmAnalise" ? "Nenhuma solicitação em análise"
                : aba === "Aprovada" ? "Nenhuma solicitação aprovada" : "Nenhuma solicitação recusada"}
            </h3>
            <p className="text-muted text-sm mt-1">
              {buscaAplicada
                ? "Confira o nome ou o CPF buscado."
                : aba === "EmAnalise" ? "Novos auto-cadastros aparecem aqui para avaliação."
                : "As decisões tomadas aparecem aqui, com o histórico e a opção de retificar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {solicitacoes.map(s => {
              const ocupado = processando[s.solicitacaoId];
              const aberta = !!expandidas[s.solicitacaoId];
              const totalSim = s.respostas.filter(r => r.resposta).length;
              const idPainel = `ds-${s.solicitacaoId}`;
              return (
                <div key={s.solicitacaoId} className="flex flex-col gap-4 p-5 rounded-lg bg-white border border-line">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0 bg-brand-50 text-brand-600">
                        {getInitials(s.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink text-sm">{s.nome}</span>
                          <span className="text-[13px] text-muted">CPF: {s.cpf}</span>
                          {s.temProblemaMemoria && (
                            <Badge variant="warning" className="gap-1"><Brain className="w-3 h-3" /> Requer apoio</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12px] text-muted">
                          <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {s.email}</span>
                          {s.telefone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {s.telefone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {s.status !== "EmAnalise" && (
                        <Badge variant={s.status === "Aprovada" ? "success" : "danger"}>{ROTULO_STATUS[s.status]}</Badge>
                      )}
                      <span className="text-xs text-muted">Enviada em {formatarDataHora(s.dtCriado)}</span>
                      {s.decididaEm && (
                        <span className="text-xs text-muted">
                          Decidida em {formatarDataHora(s.decididaEm)}{s.decididaPor ? ` por ${s.decididaPor}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {s.status === "Recusada" && s.motivoRecusa && (
                    <div className="px-4 py-3 rounded-md bg-danger-tint border border-danger-border text-[13px] text-body">
                      <span className="font-semibold text-danger">Motivo da recusa: </span>{s.motivoRecusa}
                    </div>
                  )}

                  {/* Declaração de Saúde: recolhida; o botão mostra quantas respostas foram "Sim". */}
                  <div className="rounded-md border border-line">
                    <button
                      type="button"
                      onClick={() => setExpandidas(e => ({ ...e, [s.solicitacaoId]: !aberta }))}
                      aria-expanded={aberta}
                      aria-controls={idPainel}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-canvas transition-colors ${aberta ? "rounded-t-md border-b border-line" : "rounded-md"}`}
                    >
                      <ClipboardList className="w-4 h-4 text-brand-600 shrink-0" />
                      <span className="text-[13px] font-semibold text-ink">Declaração de saúde</span>
                      <span className="text-[12px] text-muted">
                        {s.respostas.length} {s.respostas.length === 1 ? "pergunta" : "perguntas"}
                      </span>
                      {totalSim > 0 && (
                        <Badge variant="warning">{totalSim} {totalSim === 1 ? "resposta \"Sim\"" : "respostas \"Sim\""}</Badge>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
                        {aberta ? "Recolher" : "Ver respostas"}
                        <ChevronDown className={`w-4 h-4 transition-transform ${aberta ? "rotate-180" : ""}`} />
                      </span>
                    </button>

                    {aberta && (
                      <div id={idPainel} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-canvas rounded-b-md">
                        {s.respostas.map((r, i) => {
                          const idCampo = `${idPainel}-${i}`;
                          const valor = r.resposta ? (r.detalhe ? `Sim — ${r.detalhe}` : "Sim") : "Não";
                          return (
                            <div key={i} className="flex flex-col gap-1.5">
                              <label htmlFor={idCampo} className="text-[13px] font-medium text-ink leading-snug">{r.pergunta}</label>
                              <input
                                id={idCampo}
                                type="text"
                                readOnly
                                value={valor}
                                title={valor}
                                className={`w-full h-10 px-3 text-sm bg-white border rounded-md outline-none cursor-default ${
                                  r.resposta ? "border-warning-border text-warning-text font-medium" : "border-line text-body"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Histórico de decisões (decididas) */}
                  {s.historico.length > 0 && (
                    <div className="rounded-md border border-line">
                      <button
                        type="button"
                        onClick={() => setHistoricoAberto(h => ({ ...h, [s.solicitacaoId]: !h[s.solicitacaoId] }))}
                        aria-expanded={!!historicoAberto[s.solicitacaoId]}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-canvas transition-colors rounded-md"
                      >
                        <History className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="text-[13px] font-semibold text-ink">Histórico de decisões</span>
                        <span className="text-[12px] text-muted">
                          {s.historico.length} {s.historico.length === 1 ? "registro" : "registros"}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
                          {historicoAberto[s.solicitacaoId] ? "Recolher" : "Ver histórico"}
                          <ChevronDown className={`w-4 h-4 transition-transform ${historicoAberto[s.solicitacaoId] ? "rotate-180" : ""}`} />
                        </span>
                      </button>
                      {historicoAberto[s.solicitacaoId] && (
                        <ol className="border-t border-line bg-canvas rounded-b-md px-4 py-3 flex flex-col gap-3">
                          {s.historico.map((h, i) => (
                            <li key={i} className="text-[13px] text-body">
                              <div>
                                <span className="font-semibold text-ink">
                                  {ROTULO_STATUS[h.statusAnterior]} → {ROTULO_STATUS[h.statusNovo]}
                                </span>
                                {h.statusAnterior !== "EmAnalise" && <span className="text-muted"> (retificação)</span>}
                              </div>
                              <div className="text-[12px] text-muted">
                                {formatarDataHora(h.dt)} · {h.realizadoPor ?? "registro anterior ao histórico"}
                              </div>
                              {h.motivo && <div className="mt-0.5">Motivo: {h.motivo}</div>}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {/* Ações */}
                  {s.status === "EmAnalise" ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="danger" size="sm" icon={<X size={15} />} disabled={ocupado}
                        onClick={() => { setMotivo(""); setRecusarAlvo({ id: s.solicitacaoId, nome: s.nome }); }}>
                        Recusar
                      </Button>
                      <Button variant="primary" size="sm" icon={<Check size={15} />} disabled={ocupado}
                        onClick={() => setAprovarAlvo({ id: s.solicitacaoId, nome: s.nome })}>
                        Aprovar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      {!s.podeRetificar && s.motivoNaoRetificavel && (
                        <span className="text-[12px] text-muted sm:mr-auto">{s.motivoNaoRetificavel}</span>
                      )}
                      <Button variant="secondary" size="sm" icon={<RotateCcw size={15} />}
                        disabled={ocupado || !s.podeRetificar}
                        onClick={() => { setMotivo(""); setRetificarAlvo({ id: s.solicitacaoId, nome: s.nome, status: s.status }); }}>
                        Retificar decisão
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
              <p className="text-xs font-medium text-muted">
                Exibindo {solicitacoes.length} de {totais.filtrado} {totais.filtrado === 1 ? "solicitação" : "solicitações"}
              </p>
              <Paginacao pagina={pagina} totalPaginas={totais.paginas} onMudar={setPagina} />
            </div>
          </div>
        )}
      </div>

      {/* Confirmar aprovação */}
      <ConfirmModal
        isOpen={!!aprovarAlvo}
        title="Aprovar solicitação"
        description={aprovarAlvo ? `Aprovar o cadastro de ${aprovarAlvo.nome}? O proponente receberá um e-mail para concluir o primeiro acesso e definir a senha.` : ""}
        confirmText="Aprovar" cancelText="Cancelar" type="neutral"
        loading={aprovarAlvo ? processando[aprovarAlvo.id] : false}
        onConfirm={() => aprovarAlvo && aprovar(aprovarAlvo.id)}
        onCancel={() => setAprovarAlvo(null)}
      />

      {/* Recusar (motivo obrigatório) */}
      {recusarAlvo && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            role="dialog" aria-modal="true"
            onClick={e => { if (e.target === e.currentTarget) setRecusarAlvo(null); }}
          >
            <div className="bg-white rounded-xl shadow-modal w-full max-w-md p-6 animate-in zoom-in-95 duration-200 relative">
              <button
                onClick={() => setRecusarAlvo(null)}
                className="absolute right-4 top-4 w-8 h-8 grid place-items-center text-body bg-canvas border border-line rounded-md hover:bg-line-soft transition-colors"
                aria-label="Fechar"
              ><X className="w-4 h-4" /></button>

              <div className="w-12 h-12 bg-danger-tint text-danger rounded-lg grid place-items-center mb-4">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1.5">Recusar solicitação</h3>
              <p className="text-[13px] text-body mb-4 leading-relaxed">
                Recusar o cadastro de <strong className="text-ink">{recusarAlvo.nome}</strong>. O motivo abaixo será enviado por e-mail ao proponente.
              </p>
              <textarea
                autoFocus value={motivo} onChange={e => setMotivo(e.target.value)}
                rows={4} placeholder="Motivo da recusa (ex.: dados divergentes na avaliação presencial)…"
                className="w-full px-3 py-2.5 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted resize-none"
              />
              <div className="flex gap-2.5 mt-5">
                <button
                  className="flex-1 h-10 text-sm font-semibold text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors disabled:opacity-50"
                  onClick={() => setRecusarAlvo(null)}
                  disabled={processando[recusarAlvo.id]}
                >Cancelar</button>
                <button
                  className="flex-1 h-10 text-sm font-semibold rounded-md border transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-danger hover:bg-danger/90 text-white border-danger"
                  onClick={() => recusar(recusarAlvo.id, motivo.trim())}
                  disabled={!motivo.trim() || processando[recusarAlvo.id]}
                >
                  {processando[recusarAlvo.id]
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Aguarde...</>
                    : "Recusar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Retificar decisão (motivo obrigatório) */}
      {retificarAlvo && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            role="dialog" aria-modal="true"
            onClick={e => { if (e.target === e.currentTarget) setRetificarAlvo(null); }}
          >
            <div className="bg-white rounded-xl shadow-modal w-full max-w-md p-6 animate-in zoom-in-95 duration-200 relative">
              <button
                onClick={() => setRetificarAlvo(null)}
                className="absolute right-4 top-4 w-8 h-8 grid place-items-center text-body bg-canvas border border-line rounded-md hover:bg-line-soft transition-colors"
                aria-label="Fechar"
              ><X className="w-4 h-4" /></button>

              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-lg grid place-items-center mb-4">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1.5">Retificar decisão</h3>
              <p className="text-[13px] text-body mb-4 leading-relaxed">
                {retificarAlvo.status === "Aprovada" ? (
                  <>A solicitação de <strong className="text-ink">{retificarAlvo.nome}</strong> passará de aprovada para <strong className="text-ink">recusada</strong>. O proponente receberá o motivo por e-mail e o convite de primeiro acesso deixa de valer.</>
                ) : (
                  <>A solicitação de <strong className="text-ink">{retificarAlvo.nome}</strong> passará de recusada para <strong className="text-ink">aprovada</strong>, e o proponente receberá por e-mail o convite de primeiro acesso.</>
                )}
                {" "}A retificação fica registrada no histórico.
              </p>
              <textarea
                autoFocus value={motivo} onChange={e => setMotivo(e.target.value)}
                rows={4} placeholder="Motivo da retificação (ex.: erro de digitação confirmado na recepção)…"
                className="w-full px-3 py-2.5 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted resize-none"
              />
              <div className="flex gap-2.5 mt-5">
                <button
                  className="flex-1 h-10 text-sm font-semibold text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors disabled:opacity-50"
                  onClick={() => setRetificarAlvo(null)}
                  disabled={processando[retificarAlvo.id]}
                >Cancelar</button>
                <button
                  className="flex-1 h-10 text-sm font-semibold rounded-md border transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-800 text-white border-brand-600"
                  onClick={() => retificar(retificarAlvo.id, motivo.trim())}
                  disabled={!motivo.trim() || processando[retificarAlvo.id]}
                >
                  {processando[retificarAlvo.id]
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Aguarde...</>
                    : "Retificar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
