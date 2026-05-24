import { Search, ArrowDownUp, RefreshCw, Filter, List, CalendarDays } from "lucide-react";
import { MapNomesStatus } from "../constants/statusMap";
import { useState } from "react";

interface AgendamentoFiltrosProps {
  filtroAgenda: string;
  setFiltroAgenda: (v: string) => void;
  statusSelecionados: string[];
  setStatusSelecionados: (v: string[]) => void;
  filtroDataConsulta: string;
  setFiltroDataConsulta: (v: string) => void;
  ordemData: "asc" | "desc";
  setOrdemData: (v: "asc" | "desc") => void;
  limparFiltros: () => void;
  placeholderBusca?: string;
  modoExibicao?: "tabela" | "agenda";
  setModoExibicao?: (v: "tabela" | "agenda") => void;
}

export default function AgendamentoFiltros({
  filtroAgenda,
  setFiltroAgenda,
  statusSelecionados,
  setStatusSelecionados,
  filtroDataConsulta,
  setFiltroDataConsulta,
  ordemData,
  setOrdemData,
  limparFiltros,
  placeholderBusca,
  modoExibicao,
  setModoExibicao,
}: AgendamentoFiltrosProps) {
  const [menuStatusAberto, setMenuStatusAberto] = useState(false);

  return (
    <div className="bg-white p-4 rounded-3xl shadow-lg border border-purple-50 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">

      {/* Campo de Busca — largura total */}
      <div className="relative w-full sm:flex-1 sm:min-w-0">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-purple-600" />
        <input
          type="text"
          placeholder={placeholderBusca || "Pesquisar por paciente ou CPF..."}
          className="w-full pl-12 pr-4 py-3 bg-purple-50/30 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] focus:bg-white transition-all outline-none font-medium text-sm"
          value={filtroAgenda}
          onChange={(e) => setFiltroAgenda(e.target.value)}
        />
      </div>

      {/* Controles — linha própria no mobile */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

        {/* Status Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => setMenuStatusAberto(!menuStatusAberto)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 border rounded-2xl transition-all text-sm font-bold shadow-sm ${
              menuStatusAberto
                ? "border-[#7C3AED] bg-purple-50 text-[#7C3AED] ring-4 ring-purple-100"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4 shrink-0" />
            Status: ({statusSelecionados.length})
          </button>

          {menuStatusAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuStatusAberto(false)}></div>
              {/* Dropdown sempre ancorado à esquerda para não sair da tela */}
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-20 animate-in fade-in zoom-in duration-200 origin-top-left">
                <div className="px-4 py-1 mb-2 border-b border-gray-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrar Status</span>
                  {statusSelecionados.length < Object.keys(MapNomesStatus).length && (
                    <button
                      onClick={() => setStatusSelecionados(Object.keys(MapNomesStatus))}
                      className="text-[10px] text-purple-600 hover:underline font-bold"
                    >
                      Selecionar Todos
                    </button>
                  )}
                </div>
                {Object.keys(MapNomesStatus).map((statusKey) => (
                  <label key={statusKey} className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] transition-all cursor-pointer"
                      checked={statusSelecionados.includes(statusKey)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStatusSelecionados([...statusSelecionados, statusKey]);
                        } else {
                          setStatusSelecionados(statusSelecionados.filter((s) => s !== statusKey));
                        }
                      }}
                    />
                    <span className="text-sm font-bold text-gray-600 group-hover:text-[#7C3AED]">
                      {MapNomesStatus[statusKey]}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Data */}
        <input
          type="date"
          className="flex-1 sm:flex-none px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] outline-none font-bold text-sm text-gray-600 cursor-pointer"
          value={filtroDataConsulta}
          onChange={(e) => setFiltroDataConsulta(e.target.value)}
        />

        {/* Ordenação */}
        <button
          onClick={() => setOrdemData(ordemData === "asc" ? "desc" : "asc")}
          className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-purple-50 transition-colors text-purple-600"
          title="Inverter Ordem"
        >
          <ArrowDownUp className={`w-5 h-5 transition-transform duration-500 ${ordemData === "asc" ? "rotate-180" : ""}`} />
        </button>

        {/* Limpar Filtros */}
        <button
          onClick={limparFiltros}
          className="p-3 bg-gray-50 text-gray-400 border border-gray-200 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center gap-2 group shadow-sm"
          title="Limpar Filtros"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Limpar Filtros</span>
        </button>

        {/* Modo de Exibição */}
        {modoExibicao && setModoExibicao && (
          <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner shrink-0">
            <button
              onClick={() => setModoExibicao("tabela")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                modoExibicao === "tabela"
                  ? "bg-[#7C3AED] text-white shadow-md shadow-purple-200/40"
                  : "text-gray-500 hover:text-[#7C3AED] hover:bg-white/50"
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
              <span className="hidden xs:inline">Tabela</span>
            </button>
            <button
              onClick={() => setModoExibicao("agenda")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                modoExibicao === "agenda"
                  ? "bg-[#7C3AED] text-white shadow-md shadow-purple-200/40"
                  : "text-gray-500 hover:text-[#7C3AED] hover:bg-white/50"
              }`}
              title="Visualização em Agenda"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden xs:inline">Agenda</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
