import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import {
  Inbox, Search, RefreshCw, Check, X, Brain, Mail, Phone, UserCheck,
} from "lucide-react";
import { getRealDate } from "../utils/dates";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";
import ModalPortal from "../components/ui/ModalPortal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

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
};

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
  const [processando, setProcessando] = useState<Record<string, boolean>>({});

  const [aprovarAlvo, setAprovarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [recusarAlvo, setRecusarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [motivo, setMotivo] = useState("");

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar solicitações."); return; }
      setSolicitacoes(await res.json());
    } catch {
      toast.error("Erro de conexão ao carregar solicitações.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const aprovar = async (id: string) => {
    setProcessando(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes/${id}/aprovar`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      setSolicitacoes(prev => prev.filter(s => s.solicitacaoId !== id));
      toast.success("Solicitação aprovada. O proponente foi avisado por e-mail.");
    } catch {
      toast.error("Erro de conexão ao aprovar.");
    } finally {
      setProcessando(p => ({ ...p, [id]: false }));
      setAprovarAlvo(null);
    }
  };

  const recusar = async (id: string, motivoTexto: string) => {
    setProcessando(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitacoes/${id}/recusar`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ motivo: motivoTexto }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      setSolicitacoes(prev => prev.filter(s => s.solicitacaoId !== id));
      toast.success("Solicitação recusada. O proponente foi avisado por e-mail.");
      setRecusarAlvo(null);
      setMotivo("");
    } catch {
      toast.error("Erro de conexão ao recusar.");
    } finally {
      setProcessando(p => ({ ...p, [id]: false }));
    }
  };

  const filtradas = solicitacoes.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) || s.cpf.includes(busca)
  );
  const totalMemoria = solicitacoes.filter(s => s.temProblemaMemoria).length;

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
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-ink">{solicitacoes.length}</div>
          </div>
          <div className="bg-white border border-line rounded-lg px-4 py-[11px]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-warning-tint text-warning">
                <Brain className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Requer apoio (memória)</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-warning-text">{totalMemoria}</div>
          </div>
        </div>

        {/* Conteúdo */}
        {carregando ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-16 bg-white border border-line rounded-lg">
            <UserCheck className="w-10 h-10 text-muted mx-auto mb-3" />
            <h3 className="text-base font-semibold text-body">Nenhuma solicitação em análise</h3>
            <p className="text-muted text-sm mt-1">Novos auto-cadastros aparecem aqui para avaliação.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtradas.map(s => {
              const ocupado = processando[s.solicitacaoId];
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
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted">
                        {getRealDate(s.dtCriado, true)!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>

                  {/* Declaração de Saúde */}
                  <div className="bg-canvas rounded-md border border-line p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Declaração de saúde</div>
                    <div className="flex flex-col gap-2.5">
                      {s.respostas.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            r.resposta
                              ? "bg-warning-tint border-warning-border text-warning-text"
                              : "bg-success-tint border-success-border text-success"
                          }`}>
                            {r.resposta ? "Sim" : "Não"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] text-ink leading-snug">{r.pergunta}</p>
                            {r.resposta && r.detalhe && (
                              <p className="text-[12px] text-body mt-0.5 italic">“{r.detalhe}”</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
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
                </div>
              );
            })}
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
    </>
  );
}
