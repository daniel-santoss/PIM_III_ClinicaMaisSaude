import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import { AlertOctagon, AlertTriangle, ShieldAlert, Search, ShieldCheck, RefreshCw } from "lucide-react";
import { getRealDate } from '../utils/dates';

import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";

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
      <div className="bg-white rounded-[2rem] shadow-xl p-8 animate-in fade-in zoom-in-95 duration-500">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              Auditoria de Segurança IA
            </h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie violações de diretrizes e libere restrições de pacientes.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            {/* Campo de Busca */}
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#7C3AED] transition-colors" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  if (e.target.value === "") {
                    onLimparBusca?.();
                  }
                }}
                className="w-full sm:w-80 pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder-gray-400 text-gray-700 font-semibold"
              />
            </div>

            {/* Filtro por Data */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-gray-700 font-semibold cursor-pointer"
              />
            </div>

            {/* Limpar Filtros */}
            <button
              onClick={limparFiltros}
              className="w-full sm:w-auto px-5 py-3 bg-gray-50 text-gray-400 border-2 border-gray-200 rounded-xl hover:bg-purple-50 hover:text-[#7C3AED] hover:border-[#7C3AED] transition-all flex items-center justify-center gap-2 group shadow-sm text-sm font-bold cursor-pointer"
              title="Limpar Filtros"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform duration-300 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">Limpar Filtros</span>
            </button>
          </div>
        </div>

        {/* ── KPIs / Métricas Rápidas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total */}
          <div
            onClick={() => setFiltro("todas")}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 cursor-pointer select-none border-2 ${
              filtro === "todas"
                ? "bg-purple-50/40 border-[#7C3AED] shadow-md shadow-purple-100 ring-4 ring-[#7C3AED]/30 scale-[1.02]"
                : "bg-white border-gray-200 hover:border-[#7C3AED] shadow-sm hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div className="p-3 bg-[#7C3AED] text-white rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Violações</p>
              <h3 className="text-2xl font-black text-[#7C3AED] mt-1">{totalViolacoes}</h3>
            </div>
          </div>

          {/* Card 2: Graves */}
          <div
            onClick={() => setFiltro(filtro === "graves" ? "todas" : "graves")}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 cursor-pointer select-none border-2 ${
              filtro === "graves"
                ? "bg-red-50/40 border-[#dc2626] shadow-md shadow-red-100 ring-4 ring-[#dc2626]/30 scale-[1.02]"
                : "bg-white border-gray-200 hover:border-[#dc2626] shadow-sm hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div className="p-3 bg-[#dc2626] text-white rounded-xl">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Casos Graves</p>
              <h3 className="text-2xl font-black text-[#dc2626] mt-1">{gravesCount}</h3>
            </div>
          </div>

          {/* Card 3: Leves */}
          <div
            onClick={() => setFiltro(filtro === "leves" ? "todas" : "leves")}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 cursor-pointer select-none border-2 ${
              filtro === "leves"
                ? "bg-amber-50/40 border-[#f59e0b] shadow-md shadow-amber-100 ring-4 ring-[#f59e0b]/30 scale-[1.02]"
                : "bg-white border-gray-200 hover:border-[#f59e0b] shadow-sm hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div className="p-3 bg-[#f59e0b] text-white rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Casos Leves</p>
              <h3 className="text-2xl font-black text-[#d97706] mt-1">{levesCount}</h3>
            </div>
          </div>

          {/* Card 4: Bloqueios */}
          <div
            onClick={() => setFiltro(filtro === "bloqueios" ? "todas" : "bloqueios")}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 cursor-pointer select-none border-2 ${
              filtro === "bloqueios"
                ? "bg-rose-50/40 border-[#f43f5e] shadow-md shadow-rose-100 ring-4 ring-[#f43f5e]/30 scale-[1.02]"
                : "bg-white border-gray-200 hover:border-[#f43f5e] shadow-sm hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div className="p-3 bg-rose-500 text-white rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bloqueios Ativos</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">{bloqueiosAtivos}</h3>
            </div>
          </div>
        </div>

        {/* ── Conteúdo ── */}
        {carregando ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]"></div>
          </div>
        ) : violacoesFiltradas.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-600">Nenhuma violação encontrada</h3>
            <p className="text-gray-400 text-sm mb-4">O sistema está limpo com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {violacoesFiltradas.map((v) => {
              const isGrave = v.tipoViolacao === "Injecao";
              const agoraCard = new Date();
              const iaBloqueada = v.iaBloqueadaAte ? new Date(v.iaBloqueadaAte) > agoraCard : false;
              const contaBloqueada = v.contaBloqueadaAte ? new Date(v.contaBloqueadaAte) > agoraCard : false;
              const temPenalidadeAtiva = iaBloqueada || contaBloqueada;
              const isPermanente = contaBloqueada && v.contaBloqueadaAte
                ? (new Date(v.contaBloqueadaAte).getFullYear() - agoraCard.getFullYear()) > 50
                : false;
              const isMaisRecente = violacoes.find(x => x.pacienteId === v.pacienteId)?.id === v.id;
              return (
                <div
                  key={v.id}
                  className={`flex flex-col gap-4 p-6 rounded-2xl bg-white border-2 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 ${
                    isGrave ? "border-[#dc2626]" : "border-[#f59e0b]"
                  }`}
                >
                  {/* Linha superior */}
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-4">
                      {/* Avatar com borda temática vibrante */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ring-2 ${
                        isGrave ? "ring-[#dc2626] bg-[#dc2626] text-white" : "ring-[#f59e0b] bg-[#f59e0b] text-white"
                      } ring-offset-2`}>
                        {v.pacienteFotoBase64 ? (
                          <img src={v.pacienteFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(v.pacienteNome)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-bold text-gray-900 text-base">
                            {v.pacienteNome}
                          </span>
                          <span className="px-2.5 py-0.5 text-xs font-black bg-slate-800 text-white rounded-md">
                            {v.pacienteTipo === "Medico" ? "Médico" : v.pacienteTipo}
                          </span>
                          <span className="text-sm font-semibold text-gray-600">CPF: {v.pacienteCpf}</span>
                          
                          {/* Badge de Gravidade Sólido com Trigger de Filtro */}
                          <span
                            onClick={() => setFiltro(filtro === (isGrave ? "graves" : "leves") ? "todas" : (isGrave ? "graves" : "leves"))}
                            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 select-none ${
                              isGrave 
                                ? "bg-[#dc2626] text-white" 
                                : "bg-[#f59e0b] text-white"
                            }`}
                            title="Clique para filtrar por esta gravidade"
                          >
                            {isGrave ? "Grave" : "Leve"}
                          </span>
                        </div>

                        {/* Indicadores de Bloqueio Ativos em badges sólidos */}
                        {isGrave && temPenalidadeAtiva && !v.penalidadeRemovidaAguardandoLogin && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {isPermanente ? (
                              <span className="text-[10px] font-black text-white bg-[#dc2626] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                </span>
                                Banido permanentemente
                              </span>
                            ) : (
                              contaBloqueada && (
                                <span className="text-[10px] font-black text-white bg-[#dc2626] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                  </span>
                                  Conta Suspensa até {new Date(v.contaBloqueadaAte!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data */}
                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-500 font-semibold bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                        {getRealDate(v.dtCriado, true)!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo detectado */}
                  <div className="bg-slate-100/90 rounded-xl border-2 border-slate-200 p-4 pt-8 relative shadow-inner">
                    {/* Label do console alinhado à esquerda */}
                    <span className="absolute top-2.5 left-4 text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono select-none">
                      CONTEÚDO DETECTADO
                    </span>
                    <p className="text-sm font-bold font-mono text-slate-800 whitespace-pre-wrap break-words mt-2 pl-1 leading-relaxed">
                      {v.textoInserido}
                    </p>
                  </div>

                  {/* Botão */}
                  <div className="flex justify-end gap-2 pt-1">
                    {v.penalidadeRemovidaAguardandoLogin || !temPenalidadeAtiva || !isMaisRecente ? (
                      <span className="flex items-center gap-2 text-xs font-black text-white bg-[#10b981] px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/25">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        PENALIDADE REMOVIDA
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmarPaciente({ id: v.pacienteId, nome: v.pacienteNome })}
                        disabled={removendoPenalidade[v.pacienteId]}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#dc2626] hover:bg-red-700 text-white transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-red-600/10 disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                      >
                        {removendoPenalidade[v.pacienteId] ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            REMOVER PENALIDADE
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
