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
        <svg className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
          <svg className={`w-6 h-6 transition-transform duration-500 ${ordemData === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
        </button>
        <button
          onClick={limparFiltros}
          className="p-3 bg-gray-50 text-gray-400 border border-gray-200 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center gap-2 group shadow-sm"
          title="Limpar Filtros"
        >
          <svg className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Limpar Filtros</span>
        </button>
      </div>
    </div>
  );
}
