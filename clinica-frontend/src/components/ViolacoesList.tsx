import { useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import { AlertOctagon, AlertTriangle, ShieldAlert, XCircle, Search } from "lucide-react";

type Violacao = {
  id: string;
  pacienteNome: string;
  pacienteCpf: string;
  tipoViolacao: string;
  textoInserido: string;
  dtCriado: string;
};

export default function ViolacoesList() {
  const [violacoes, setViolacoes] = useState<Violacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "graves" | "leves">("todas");
  const [busca, setBusca] = useState("");

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
        }
      } catch (err) {
        console.error("Erro ao carregar violações", err);
      } finally {
        setCarregando(false);
      }
    };
    fetchViolacoes();
  }, []);

  const violacoesFiltradas = violacoes.filter((v) => {
    // Filtro de Busca (Nome ou CPF)
    const matchBusca =
      v.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      v.pacienteCpf.includes(busca);

    // Filtro de Gravidade
    let matchGravidade = true;
    if (filtro === "graves") {
      matchGravidade = v.tipoViolacao === "Injecao";
    } else if (filtro === "leves") {
      matchGravidade = v.tipoViolacao === "UsoIndevido";
    }

    return matchBusca && matchGravidade;
  });

  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Auditoria de Segurança IA
          </h2>
          <p className="text-sm text-gray-500 font-medium ml-10">
            Monitoramento de uso indevido e tentativas de injeção no assistente virtual.
          </p>
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
              className="w-full sm:w-64 pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
            />
          </div>

          {/* Filtro de Gravidade */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setFiltro("todas")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filtro === "todas" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltro("graves")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                filtro === "graves" ? "bg-red-50 text-red-600 shadow-sm" : "text-gray-500 hover:text-red-500"
              }`}
            >
              <AlertOctagon className="w-3 h-3" /> Graves
            </button>
            <button
              onClick={() => setFiltro("leves")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                filtro === "leves" ? "bg-orange-50 text-orange-600 shadow-sm" : "text-gray-500 hover:text-orange-500"
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Leves
            </button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
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
                className={`flex flex-col md:flex-row gap-4 p-5 rounded-2xl border-2 transition-all hover:scale-[1.01] ${
                  isGrave ? "bg-red-50/50 border-red-100" : "bg-orange-50/50 border-orange-100"
                }`}
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isGrave ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {isGrave ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900">{v.pacienteNome}</h3>
                    <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {v.pacienteCpf}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isGrave ? "bg-red-200 text-red-800" : "bg-orange-200 text-orange-800"
                      }`}
                    >
                      {isGrave ? "Banido Permanentemente" : "Suspensão Temporária"}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto font-medium">
                      {new Date(v.dtCriado).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100/50 relative group">
                    <span className="absolute -top-2.5 left-4 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-white px-1">
                      Texto Interceptado
                    </span>
                    <p className="text-sm font-mono text-gray-700 whitespace-pre-wrap break-words mt-1">
                      {v.textoInserido}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
