import { useEffect, useState } from "react";
import { ESPECIALIDADES } from "../constants/especialidades";

export default function PerfilMedico() {
  const [medico, setMedico] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [especialidades, setEspecialidades] = useState<{id: number, nome: string}[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [focado, setFocado] = useState(false);
  
  const profissionalId = localStorage.getItem("profissionalId");
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const carregar = async () => {
      try {
        const [resMedico, resEsp] = await Promise.all([
          fetch(`http://localhost:5045/api/Profissionais/${profissionalId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch("http://localhost:5045/api/Especialidades/minhas", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (resMedico.ok) setMedico(await resMedico.json());
        if (resEsp.ok) setEspecialidades(await resEsp.json());
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    if (profissionalId) carregar();
  }, [profissionalId, token]);

  const adicionarEspecialidade = (esp: string) => {
    const idx = ESPECIALIDADES.indexOf(esp as any);
    if (idx >= 0 && !especialidades.some(e => e.nome === esp)) {
      setEspecialidades([...especialidades, { id: idx, nome: esp }]);
    }
    setBusca("");
  };

  const removerEspecialidade = (nome: string) => {
    setEspecialidades(especialidades.filter(e => e.nome !== nome));
  };

  const salvarEspecialidades = async () => {
    setSalvando(true);
    try {
      const res = await fetch("http://localhost:5045/api/Especialidades/minhas", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(especialidades.map(e => e.id))
      });
      if (res.ok) setEspecialidades(await res.json());
    } catch (e) { console.error(e); }
    finally { setSalvando(false); }
  };

  const nomesSelecionados = especialidades.map(e => e.nome);
  const especialidadesFiltradas = ESPECIALIDADES.filter(
    esp => esp.toLowerCase().includes(busca.toLowerCase()) && !nomesSelecionados.includes(esp)
  );

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto space-y-10">
      {/* Header Medico */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-100">
          MD
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{medico?.nome}</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">CRM: {medico?.crm}{medico?.ufCrm ? `-${medico.ufCrm}` : ''}</p>
        </div>
      </div>

      {/* Seção Especialidades */}
      <div className="space-y-4">
        <div className="flex items-center justify-between ml-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Minhas Especialidades</h3>
          <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded-lg">{especialidades.length} selecionada{especialidades.length !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {especialidades.map(esp => (
              <span key={esp.id} className="inline-flex items-center gap-2 bg-purple-50 text-[#7C3AED] px-4 py-2 rounded-xl text-xs font-black border border-purple-100 group animate-in zoom-in duration-200">
                {esp.nome}
                <button onClick={() => removerEspecialidade(esp.nome)} className="hover:text-red-500 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </span>
            ))}
            {especialidades.length === 0 && <p className="text-xs text-gray-400 italic">Nenhuma especialidade selecionada.</p>}
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <input 
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onFocus={() => setFocado(true)}
              onBlur={() => setTimeout(() => setFocado(false), 200)}
              placeholder="Buscar nova especialidade..."
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-400 font-bold text-sm transition-all"
            />
            {(busca || focado) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {especialidadesFiltradas.length > 0 ? (
                    especialidadesFiltradas.map(esp => (
                      <button 
                        key={esp}
                        onClick={() => adicionarEspecialidade(esp)}
                        className="w-full text-left px-6 py-3 text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        {esp}
                      </button>
                    ))
                  ) : (
                    <p className="px-6 py-4 text-xs text-gray-400 font-bold uppercase tracking-widest">Nenhuma sugestão disponível</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Finais */}
      <div className="pt-6">
        <button
          onClick={salvarEspecialidades}
          disabled={salvando}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
