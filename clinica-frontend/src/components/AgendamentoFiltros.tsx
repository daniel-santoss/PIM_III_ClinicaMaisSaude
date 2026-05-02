import { Calendar, AlertCircle, BarChart2, TrendingUp, Search, ArrowDownUp, RotateCcw } from "lucide-react";
const MapNomesStatus: Record<string, string> = {
  "Agendado": "Agendado",
  "EmAtendimento": "Em Atendimento",
  "AguardandoRetorno": "Aguardando Retorno",
  "RetornoAgendado": "Retorno Agendado",
  "Finalizado": "Finalizado",
  "Faltou": "Faltou",
  "Cancelado": "Cancelado"
};

interface AgendamentoFiltrosProps {
  filtroAgenda: string;
  setFiltroAgenda: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  filtroDataConsulta: string;
  setFiltroDataConsulta: (v: string) => void;
  ordemData: "asc" | "desc";
  setOrdemData: (v: "asc" | "desc") => void;
  limparFiltros: () => void;
}

export default function AgendamentoFiltros({
  filtroAgenda,
  setFiltroAgenda,
  filtroStatus,
  setFiltroStatus,
  filtroDataConsulta,
  setFiltroDataConsulta,
  ordemData,
  setOrdemData,
  limparFiltros,
}: AgendamentoFiltrosProps) {
  return (
    <div className="bg-white p-4 rounded-3xl shadow-lg border border-purple-50 flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[280px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="absolute left-4 top-3.5 w-5 h-5 text-purple-600 lucide lucide-search-icon lucide-search"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
        <input
          type="text"
          placeholder="Pesquisar por paciente ou CPF..."
          className="w-full pl-12 pr-4 py-3 bg-purple-50/30 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] focus:bg-white transition-all outline-none font-medium text-sm"
          value={filtroAgenda}
          onChange={(e) => setFiltroAgenda(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] outline-none font-bold text-sm text-gray-600 cursor-pointer"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="Todos">Todos os Status</option>
          {Object.keys(MapNomesStatus).map(s => (
            <option key={s} value={s}>{MapNomesStatus[s]}</option>
          ))}
        </select>

        <input
          type="date"
          className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] outline-none font-bold text-sm text-gray-600 cursor-pointer"
          value={filtroDataConsulta}
          onChange={(e) => setFiltroDataConsulta(e.target.value)}
        />

        <button
          onClick={() => setOrdemData(ordemData === "asc" ? "desc" : "asc")}
          className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-purple-50 transition-colors text-purple-600"
          title="Inverter Ordem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={`w-6 h-6 transition-transform duration-500 ${ordemData === 'asc' ? 'rotate-180' : ''}`}><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>
        </button>
        <button
          onClick={limparFiltros}
          className="p-3 bg-gray-50 text-gray-400 border border-gray-200 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center gap-2 group shadow-sm"
          title="Limpar Filtros"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Limpar Filtros</span>
        </button>
      </div>
    </div>
  );
}
