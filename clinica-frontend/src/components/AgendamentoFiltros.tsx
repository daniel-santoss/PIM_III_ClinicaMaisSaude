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
    <div className="bg-white border border-line rounded-lg px-5 py-4 flex items-center gap-3 flex-wrap">

      {/* Campo de Busca */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder={placeholderBusca || "Pesquisar por paciente ou CPF..."}
          className="w-full h-10 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted"
          value={filtroAgenda}
          onChange={(e) => setFiltroAgenda(e.target.value)}
        />
      </div>

      {/* Status Dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuStatusAberto(!menuStatusAberto)}
          className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
        >
          <Filter className="w-[15px] h-[15px] shrink-0" />
          Status <span className="text-muted">({statusSelecionados.length})</span>
        </button>

        {menuStatusAberto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuStatusAberto(false)}></div>
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-lg shadow-modal border border-line py-2 z-20">
              <div className="px-4 py-1 mb-1 border-b border-line-soft flex justify-between items-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Filtrar status</span>
                {statusSelecionados.length < Object.keys(MapNomesStatus).length && (
                  <button
                    onClick={() => setStatusSelecionados(Object.keys(MapNomesStatus))}
                    className="text-[11px] text-brand-600 hover:underline font-semibold"
                  >
                    Selecionar todos
                  </button>
                )}
              </div>
              {Object.keys(MapNomesStatus).map((statusKey) => (
                <label key={statusKey} className="flex items-center gap-3 px-4 py-2 hover:bg-canvas cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-brand-600"
                    checked={statusSelecionados.includes(statusKey)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setStatusSelecionados([...statusSelecionados, statusKey]);
                      } else {
                        setStatusSelecionados(statusSelecionados.filter((s) => s !== statusKey));
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-body">{MapNomesStatus[statusKey]}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Data */}
      <input
        type="date"
        className="h-10 px-3 text-[13px] text-body bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
        value={filtroDataConsulta}
        onChange={(e) => setFiltroDataConsulta(e.target.value)}
      />

      {/* Ordenação */}
      <button
        onClick={() => setOrdemData(ordemData === "asc" ? "desc" : "asc")}
        className="w-10 h-10 grid place-items-center bg-white border border-line rounded-md text-body hover:bg-canvas transition-colors"
        title="Inverter ordem"
      >
        <ArrowDownUp className={`w-[17px] h-[17px] transition-transform duration-500 ${ordemData === "asc" ? "rotate-180" : ""}`} />
      </button>

      {/* Limpar Filtros */}
      <button
        onClick={limparFiltros}
        className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
        title="Limpar filtros"
      >
        <RefreshCw className="w-[15px] h-[15px]" />
        <span className="hidden lg:inline">Limpar</span>
      </button>

      {/* Modo de Exibição */}
      {modoExibicao && setModoExibicao && (
        <div className="flex bg-canvas border border-line rounded-md p-[3px] shrink-0">
          <button
            onClick={() => setModoExibicao("tabela")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-colors ${
              modoExibicao === "tabela" ? "bg-brand-600 text-white" : "text-body hover:bg-white"
            }`}
            title="Visualização em tabela"
          >
            <List className="w-4 h-4" />
            <span className="hidden xs:inline">Tabela</span>
          </button>
          <button
            onClick={() => setModoExibicao("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-colors ${
              modoExibicao === "agenda" ? "bg-brand-600 text-white" : "text-body hover:bg-white"
            }`}
            title="Visualização em card"
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden xs:inline">Agenda</span>
          </button>
        </div>
      )}
    </div>
  );
}
