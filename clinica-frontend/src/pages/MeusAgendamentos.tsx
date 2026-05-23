import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { Calendar, Plus } from 'lucide-react';
import AgendamentoCard from "../components/AgendamentoCard";
import AgendamentoFiltros from "../components/AgendamentoFiltros";
import { getRealDate } from "../utils/dates";
import { MapNomesStatus, MapNomesTipoConsulta, MapNomesEspecialidade } from "../constants/statusMap";

interface AgendamentoItem {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  dataHoraConsulta: string;
  tipoProfissional: string;
  tipoConsulta: string;
  status: string;
  nomeProfissional: string;
  especialidade?: string;
  observacao?: string;
  exigeResultadoPosterior?: boolean;
  resultadoDisponivel?: boolean;
  resultadoRetirado?: boolean;
}

interface MeusAgendamentosProps {
  onNovoAgendamento: () => void;
  agendamentoDestaque?: string | null;
}

export default function MeusAgendamentos({ onNovoAgendamento, agendamentoDestaque }: MeusAgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const pacienteId = localStorage.getItem("pacienteId");
  const token = localStorage.getItem("authToken");

  const STATUS_PADRAO = ["Agendado", "EmAtendimento", "AguardandoRetorno", "RetornoAgendado"];

  const [filtroAgenda, setFiltroAgenda] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>(STATUS_PADRAO);
  const [filtroDataConsulta, setFiltroDataConsulta] = useState(() => new Date().toISOString().split('T')[0]);
  const [ordemData, setOrdemData] = useState<"asc" | "desc">("desc");

  const limparFiltros = () => {
    setFiltroAgenda("");
    setStatusSelecionados(STATUS_PADRAO);
    setFiltroDataConsulta("");
    setOrdemData("desc");
  };

  const carregarAgendamentos = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/Agendamentos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        const lista = dados.items ?? dados;
        setAgendamentos(lista.sort((a: any, b: any) => getRealDate(b.dataHoraConsulta)!.getTime() - getRealDate(a.dataHoraConsulta)!.getTime()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAgendamentos();
  }, [pacienteId, token]);

  useEffect(() => {
    if (agendamentoDestaque) {
      setFiltroDataConsulta("");
      setStatusSelecionados(Object.keys(MapNomesStatus));
    }
  }, [agendamentoDestaque]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4 xl:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meus Agendamentos</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Histórico e consultas marcadas</p>
        </div>
        <button
          onClick={onNovoAgendamento}
          className="w-full md:w-fit px-6 py-3 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Novo Agendamento
        </button>
      </div>

      <AgendamentoFiltros
        filtroAgenda={filtroAgenda} setFiltroAgenda={setFiltroAgenda}
        statusSelecionados={statusSelecionados} setStatusSelecionados={setStatusSelecionados}
        filtroDataConsulta={filtroDataConsulta} setFiltroDataConsulta={setFiltroDataConsulta}
        ordemData={ordemData} setOrdemData={setOrdemData}
        limparFiltros={limparFiltros}
        placeholderBusca="Pesquisar por médico ou especialidade..."
      />

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Carregando suas consultas...</p>
        </div>
      ) : agendamentos.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {agendamentos
              .filter(a => {
                const termo = filtroAgenda.toLowerCase();
                const matchBusca = a.nomeProfissional.toLowerCase().includes(termo) || 
                                  (a.especialidade && a.especialidade.toLowerCase().includes(termo)) ||
                                  (a.tipoConsulta && a.tipoConsulta.toLowerCase().includes(termo)) ||
                                  (MapNomesTipoConsulta[a.tipoConsulta]?.toLowerCase() || "").includes(termo) ||
                                  (MapNomesEspecialidade[a.especialidade || ""]?.toLowerCase() || "").includes(termo);
                const matchStatus = statusSelecionados.includes(a.status);
                const matchData = !filtroDataConsulta || a.dataHoraConsulta.startsWith(filtroDataConsulta);
                return matchBusca && matchStatus && matchData;
              })
              .sort((a, b) => {
                const dA = getRealDate(a.dataHoraConsulta)!.getTime();
                const dB = getRealDate(b.dataHoraConsulta)!.getTime();
                return ordemData === "desc" ? dB - dA : dA - dB;
              })
              .map(a => (
              <AgendamentoCard
                key={a.id}
                agenda={a}
                highlighted={a.id === agendamentoDestaque}
                opcoesValidas={[]}
                podeCancelar={false}
                podeRemarcar={false}
                tipoUsuarioLogado="Paciente"
              />
            ))}
          </div>
          
          <div className="px-6 py-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between mt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Mostrando resultados filtrados
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-gray-400 text-sm font-medium mb-8">Você ainda não possui consultas marcadas no sistema.</p>
          <button onClick={onNovoAgendamento} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Marcar Primeira Consulta</button>
        </div>
      )}
    </div>
  );
}
