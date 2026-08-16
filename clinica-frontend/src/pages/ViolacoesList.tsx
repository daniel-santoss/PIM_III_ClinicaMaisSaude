import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import { AlertOctagon, AlertTriangle, ShieldAlert, Search, ShieldCheck, ShieldOff, RefreshCw, Lock } from "lucide-react";
import { getRealDate } from '../utils/dates';

import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";
import Badge from "../components/ui/Badge";

type Violacao = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteTipo: string;
  pacienteFotoBase64?: string;
  tipoViolacao: string;
  textoInserido: string;
  dtCriado: string;
  penalidadeRemovidaAguardandoLogin: boolean;
  iaBloqueadaAte: string | null;
  contaBloqueadaAte: string | null;
  banidoPermanente: boolean;
};

export default function ViolacoesList({ buscaInicial = "", onLimparBusca }: { buscaInicial?: string; onLimparBusca?: () => void }) {
  const [violacoes, setViolacoes] = useState<Violacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "graves" | "leves" | "bloqueios">("bloqueios");
  const [busca, setBusca] = useState(buscaInicial);
  const [dataFiltro, setDataFiltro] = useState("");
  const [removendoPenalidade, setRemovendoPenalidade] = useState<Record<string, boolean>>({});
  const [confirmarPaciente, setConfirmarPaciente] = useState<{ id: string; nome: string } | null>(null);
  const toast = useToast();

  const limparFiltros = () => {
    setFiltro("bloqueios");
    setBusca("");
    setDataFiltro("");
    onLimparBusca?.();
  };

  useEffect(() => {
    setBusca(buscaInicial);
  }, [buscaInicial]);

  // O scroll block é gerenciado internamente pelo ConfirmModal

  useEffect(() => {
    const fetchViolacoes = async () => {
      setCarregando(true);
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${API_URL}/api/Consultas/violacoes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setViolacoes(data);
        } else {
          toast.error("Erro ao carregar violações");
        }
      } catch (err) {
        toast.error("Erro de conexão ao carregar violações.");
      } finally {
        setCarregando(false);
      }
    };
    fetchViolacoes();
  }, []);

  const removerPenalidade = async (pacienteId: string) => {
    setRemovendoPenalidade(prev => ({ ...prev, [pacienteId]: true }));
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/api/Consultas/violacoes/${pacienteId}/penalidade`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setViolacoes(prev => prev.map(v =>
          v.pacienteId === pacienteId
            ? { ...v, penalidadeRemovidaAguardandoLogin: true, iaBloqueadaAte: null, contaBloqueadaAte: null }
            : v
        ));
        toast.success("Penalidade removida com sucesso.");
      } else {
        toast.error(await res.text());
      }
    } catch (err) {
      toast.error("Erro de conexão ao remover penalidade.");
    } finally {
      setRemovendoPenalidade(prev => ({ ...prev, [pacienteId]: false }));
    }
  };

  const totalViolacoes = violacoes.length;
  const gravesCount = violacoes.filter(v => v.tipoViolacao === "Injecao").length;
  const levesCount = violacoes.filter(v => v.tipoViolacao === "UsoIndevido").length;
  
  const agora = new Date();
  const bloqueiosAtivos = new Set(
    violacoes
      .filter(v => {
        const iaBloqueada = v.iaBloqueadaAte ? new Date(v.iaBloqueadaAte) > agora : false;
        const contaBloqueada = v.contaBloqueadaAte ? new Date(v.contaBloqueadaAte) > agora : false;
        return (iaBloqueada || contaBloqueada) && !v.penalidadeRemovidaAguardandoLogin;
      })
      .map(v => v.pacienteId)
  ).size;

  const violacoesFiltradas = violacoes.filter((v) => {
    const matchBusca =
      v.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      v.pacienteCpf.includes(busca);

    let matchGravidade = true;
    if (filtro === "graves") matchGravidade = v.tipoViolacao === "Injecao";
    else if (filtro === "leves") matchGravidade = v.tipoViolacao === "UsoIndevido";
    else if (filtro === "bloqueios") {
      const agoraCard = new Date();
      const iaBloqueada = v.iaBloqueadaAte ? new Date(v.iaBloqueadaAte) > agoraCard : false;
      const contaBloqueada = v.contaBloqueadaAte ? new Date(v.contaBloqueadaAte) > agoraCard : false;
      const isMaisRecente = violacoes.find(x => x.pacienteId === v.pacienteId)?.id === v.id;
      matchGravidade = (iaBloqueada || contaBloqueada) && !v.penalidadeRemovidaAguardandoLogin && isMaisRecente;
    }

    let matchData = true;
    if (dataFiltro) {
      const dateObj = getRealDate(v.dtCriado, true)!;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      matchData = formattedDate === dataFiltro;
    }

    return matchBusca && matchGravidade && matchData;
  });

  const getInitials = (nome: string) =>
    nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <>
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">

        {/* ── Toolbar / Cabeçalho ── */}
        <div className="bg-white border border-line rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 shrink-0 rounded-lg grid place-items-center bg-danger-tint text-danger">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="mr-auto min-w-0">
            <h2 className="font-semibold text-base text-ink">Auditoria de segurança IA</h2>
            <p className="text-[13px] text-muted mt-0.5">Gerencie violações de diretrizes e libere restrições de pacientes.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (e.target.value === "") onLimparBusca?.();
              }}
              className="w-full sm:w-64 h-10 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted"
            />
          </div>
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="h-10 px-3 text-[13px] text-body bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
          />
          <button
            onClick={limparFiltros}
            className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
            title="Limpar filtros"
          >
            <RefreshCw className="w-[15px] h-[15px]" /> Limpar
          </button>
        </div>

        {/* ── KPIs / Métricas Rápidas (também filtram a lista) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <button
            onClick={() => setFiltro("todas")}
            className={`text-left bg-white border rounded-lg px-4 py-[11px] transition-colors ${
              filtro === "todas" ? "border-brand-600 ring-1 ring-brand-600" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-brand-50 text-brand-600">
                <ShieldAlert className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Total violações</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-ink">{totalViolacoes}</div>
          </button>

          {/* Card 2: Graves */}
          <button
            onClick={() => setFiltro(filtro === "graves" ? "todas" : "graves")}
            className={`text-left bg-white border rounded-lg px-4 py-[11px] transition-colors ${
              filtro === "graves" ? "border-danger ring-1 ring-danger" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-danger-tint text-danger">
                <AlertOctagon className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Casos graves</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-danger">{gravesCount}</div>
          </button>

          {/* Card 3: Leves */}
          <button
            onClick={() => setFiltro(filtro === "leves" ? "todas" : "leves")}
            className={`text-left bg-white border rounded-lg px-4 py-[11px] transition-colors ${
              filtro === "leves" ? "border-warning ring-1 ring-warning" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-warning-tint text-warning">
                <AlertTriangle className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Casos leves</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-warning-text">{levesCount}</div>
          </button>

          {/* Card 4: Bloqueios */}
          <button
            onClick={() => setFiltro(filtro === "bloqueios" ? "todas" : "bloqueios")}
            className={`text-left bg-white border rounded-lg px-4 py-[11px] transition-colors ${
              filtro === "bloqueios" ? "border-brand-600 ring-1 ring-brand-600" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-[#EEF2F7] text-body">
                <Lock className="w-[17px] h-[17px]" />
              </div>
              <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">Bloqueios ativos</span>
            </div>
            <div className="font-bold text-[22px] leading-tight mt-0.5 text-ink">{bloqueiosAtivos}</div>
          </button>
        </div>

        {/* ── Conteúdo ── */}
        {carregando ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C5282]"></div>
          </div>
        ) : violacoesFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white border border-line rounded-lg">
            <ShieldAlert className="w-10 h-10 text-muted mx-auto mb-3" />
            <h3 className="text-base font-semibold text-body">Nenhuma violação encontrada</h3>
            <p className="text-muted text-sm mt-1">O sistema está limpo com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {violacoesFiltradas.map((v) => {
              const isGrave = v.tipoViolacao === "Injecao";
              const agoraCard = new Date();
              const iaBloqueada = v.iaBloqueadaAte ? new Date(v.iaBloqueadaAte) > agoraCard : false;
              const contaBloqueada = v.contaBloqueadaAte ? new Date(v.contaBloqueadaAte) > agoraCard : false;
              const temPenalidadeAtiva = iaBloqueada || contaBloqueada || v.banidoPermanente;
              const isPermanente = v.banidoPermanente || (contaBloqueada && v.contaBloqueadaAte
                ? (new Date(v.contaBloqueadaAte).getFullYear() - agoraCard.getFullYear()) > 50
                : false);
              const isMaisRecente = violacoes.find(x => x.pacienteId === v.pacienteId)?.id === v.id;
              return (
                <div key={v.id} className="flex flex-col gap-4 p-5 rounded-lg bg-white border border-line">
                  {/* Linha superior */}
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0 overflow-hidden ${
                        isGrave ? "bg-danger-tint text-danger" : "bg-warning-tint text-warning"
                      }`}>
                        {v.pacienteFotoBase64 ? (
                          <img src={v.pacienteFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(v.pacienteNome)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-semibold text-ink text-sm">{v.pacienteNome}</span>
                          <Badge variant="neutral">{v.pacienteTipo === "Medico" ? "Médico" : v.pacienteTipo}</Badge>
                          <span className="text-[13px] text-muted">CPF: {v.pacienteCpf}</span>
                          <button
                            onClick={() => setFiltro(filtro === (isGrave ? "graves" : "leves") ? "todas" : (isGrave ? "graves" : "leves"))}
                            title="Clique para filtrar por esta gravidade"
                          >
                            <Badge variant={isGrave ? "danger" : "warning"} className="cursor-pointer">
                              {isGrave ? "Grave" : "Leve"}
                            </Badge>
                          </button>
                        </div>

                        {/* Indicadores de bloqueio ativos */}
                        {isGrave && temPenalidadeAtiva && !v.penalidadeRemovidaAguardandoLogin && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {isPermanente ? (
                              <span className="text-[11px] font-semibold text-danger bg-danger-tint border border-danger-border px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                                Banido permanentemente
                              </span>
                            ) : (
                              contaBloqueada && (
                                <span className="text-[11px] font-semibold text-danger bg-danger-tint border border-danger-border px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                                  Conta suspensa até {new Date(v.contaBloqueadaAte!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data */}
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted">
                        {getRealDate(v.dtCriado, true)!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo detectado */}
                  <div className="bg-canvas rounded-md border border-line p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Conteúdo detectado</div>
                    <p className="text-sm font-medium font-mono text-ink whitespace-pre-wrap break-words leading-relaxed">
                      {v.textoInserido}
                    </p>
                  </div>

                  {/* Ação */}
                  <div className="flex justify-end gap-2">
                    {v.penalidadeRemovidaAguardandoLogin ? (
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-success bg-success-tint border border-success-border px-3.5 py-2 rounded-md">
                        <ShieldCheck className="w-4 h-4" />
                        Penalidade removida
                      </span>
                    ) : !temPenalidadeAtiva || !isMaisRecente ? (
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted bg-canvas border border-line px-3.5 py-2 rounded-md">
                        <ShieldOff className="w-4 h-4" />
                        Sem restrição ativa
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmarPaciente({ id: v.pacienteId, nome: v.pacienteNome })}
                        disabled={removendoPenalidade[v.pacienteId]}
                        className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-md text-[13px] font-semibold bg-white text-brand-600 border border-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {removendoPenalidade[v.pacienteId] ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Liberar restrição
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Confirmação ── */}
      <ConfirmModal
        isOpen={!!confirmarPaciente}
        title="Remover Penalidade"
        description={confirmarPaciente ? `Tem certeza que deseja remover a penalidade de IA de ${confirmarPaciente.nome}? O paciente será notificado no próximo login.` : ''}
        confirmText="Remover"
        cancelText="Cancelar"
        type="neutral"
        loading={confirmarPaciente ? removendoPenalidade[confirmarPaciente.id] : false}
        onConfirm={() => {
          if (confirmarPaciente) {
            removerPenalidade(confirmarPaciente.id);
            setConfirmarPaciente(null);
          }
        }}
        onCancel={() => setConfirmarPaciente(null)}
      />
    </>
  );
}
