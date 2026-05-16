import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import { AlertOctagon, AlertTriangle, ShieldAlert, Search, ShieldCheck } from "lucide-react";

import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "./ConfirmModal";

type Violacao = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf: string;
  tipoViolacao: string;
  textoInserido: string;
  dtCriado: string;
  penalidadeRemovidaAguardandoLogin: boolean;
  iaBloqueadaAte: string | null;
};

export default function ViolacoesList() {
  const [violacoes, setViolacoes] = useState<Violacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "graves" | "leves">("todas");
  const [busca, setBusca] = useState("");
  const [removendoPenalidade, setRemovendoPenalidade] = useState<Record<string, boolean>>({});
  const [confirmarPaciente, setConfirmarPaciente] = useState<{ id: string; nome: string } | null>(null);
  const toast = useToast();

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
            ? { ...v, penalidadeRemovidaAguardandoLogin: true, iaBloqueadaAte: null }
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

  const violacoesFiltradas = violacoes.filter((v) => {
    const matchBusca =
      v.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      v.pacienteCpf.includes(busca);

    let matchGravidade = true;
    if (filtro === "graves") matchGravidade = v.tipoViolacao === "Injecao";
    else if (filtro === "leves") matchGravidade = v.tipoViolacao === "UsoIndevido";

    return matchBusca && matchGravidade;
  });

  const getInitials = (nome: string) =>
    nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <>
      <div className="bg-white rounded-[2rem] shadow-xl p-8 animate-in fade-in zoom-in-95 duration-500">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              Auditoria de Segurança IA
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:border-[#7C3AED] outline-none transition-all"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-1">
              <button
                onClick={() => setFiltro("todas")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  filtro === "todas"
                    ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                    : "bg-white text-[#7C3AED] border-[#7C3AED] hover:bg-purple-50"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltro("graves")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                  filtro === "graves"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-600 border-red-400 hover:bg-red-100"
                }`}
              >
                <AlertOctagon className="w-3 h-3" /> Graves
              </button>
              <button
                onClick={() => setFiltro("leves")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                  filtro === "leves"
                    ? "bg-yellow-400 text-white border-yellow-400"
                    : "bg-yellow-50 text-yellow-600 border-yellow-400 hover:bg-yellow-100"
                }`}
              >
                <AlertTriangle className="w-3 h-3" /> Leves
              </button>
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
            <p className="text-gray-400 text-sm">O sistema está limpo com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {violacoesFiltradas.map((v) => {
              const isGrave = v.tipoViolacao === "Injecao";
              return (
                <div
                  key={v.id}
                  className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Linha superior */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-purple-100 text-[#7C3AED]">
                      {getInitials(v.pacienteNome)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{v.pacienteNome}</span>
                        <span className="text-xs font-mono text-gray-400">CPF: {v.pacienteCpf}</span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isGrave ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {isGrave ? "Grave" : "Leve"}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-gray-400 font-medium shrink-0">
                      {new Date(v.dtCriado).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </span>
                  </div>

                  {/* Conteúdo detectado */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 pt-5 relative">
                    <span className="absolute top-1.5 left-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Conteúdo Detectado
                    </span>
                    <p className="text-sm font-mono text-gray-700 whitespace-pre-wrap break-words mt-1">
                      {v.textoInserido}
                    </p>
                  </div>

                  {/* Botão */}
                  <div className="flex justify-end gap-2 pt-1">
                    {v.penalidadeRemovidaAguardandoLogin ? (
                      <span className="flex items-center gap-1.5 text-xs font-black text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                        <ShieldCheck className="w-4 h-4" />
                        PENALIDADE REMOVIDA
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmarPaciente({ id: v.pacienteId, nome: v.pacienteNome })}
                        disabled={removendoPenalidade[v.pacienteId]}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {removendoPenalidade[v.pacienteId] ? (
                          <>
                            <div className="w-3 h-3 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
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
