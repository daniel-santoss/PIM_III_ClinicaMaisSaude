import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { Calendar, Plus } from 'lucide-react';
import AgendamentoFiltros from "../components/AgendamentoFiltros";
import { getRealDate } from "../utils/dates";
import { MapNomesStatus, MapNomesTipoConsulta, MapNomesEspecialidade } from "../constants/statusMap";
import AgendamentoVisualizador from "../components/AgendamentoVisualizador";
import type { AgendamentoVisualizadorItem } from "../components/AgendamentoVisualizador";
import ConfirmModal from "../components/ConfirmModal";
import ModalRemarcar from "../components/ModalRemarcar";
import { useToast } from "../hooks/useToast";



interface MeusAgendamentosProps {
  onNovoAgendamento: () => void;
  agendamentoDestaque?: string | null;
}

export default function MeusAgendamentos({ onNovoAgendamento, agendamentoDestaque }: MeusAgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoVisualizadorItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const toast = useToast();
  const [cancelarAlvo, setCancelarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterarAlvo, setAlterarAlvo] = useState<any | null>(null);
  const pacienteId = localStorage.getItem("pacienteId");
  const token = localStorage.getItem("authToken");

  const STATUS_PADRAO = Object.keys(MapNomesStatus);

  const [filtroAgenda, setFiltroAgenda] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>(STATUS_PADRAO);
  const [filtroDataConsulta, setFiltroDataConsulta] = useState("");
  const [ordemData, setOrdemData] = useState<"asc" | "desc">("desc");
  const [modoExibicao, setModoExibicao] = useState<"tabela" | "agenda">("tabela");

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

  const confirmarCancelamento = async () => {
    if (!cancelarAlvo) return;
    setCancelando(true);
    try {
      const response = await fetch(`${API_URL}/api/Agendamentos/${cancelarAlvo.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(6) // 6 is Cancelado
      });

      if (!response.ok) {
        toast.error(await response.text());
        return;
      }

      toast.success("Consulta cancelada com sucesso.");
      setCancelarAlvo(null);
      carregarAgendamentos();
    } catch (e) {
      toast.error("Erro de conexão ao cancelar agendamento.");
    } finally {
      setCancelando(false);
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

  const agendamentosFiltrados = agendamentos
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
    });

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
        modoExibicao={modoExibicao} setModoExibicao={setModoExibicao}
      />

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Carregando suas consultas...</p>
        </div>
      ) : agendamentos.length > 0 ? (
        <>
          <AgendamentoVisualizador
            agendamentos={agendamentosFiltrados}
            modoExibicao={modoExibicao}
            ordemData={ordemData}
            tipoUsuario="Paciente"
            agendamentoDestaque={agendamentoDestaque}
            onCancelar={(id, nome) => setCancelarAlvo({ id, nome })}
            onRemarcar={(agenda) => setAlterarAlvo(agenda)}
          />
          
          <div className="px-6 py-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between mt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Exibindo {agendamentosFiltrados.length} de {agendamentos.length} {agendamentos.length === 1 ? "consulta" : "consultas"}
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

      {alterarAlvo && (
        <ModalRemarcar
          agenda={alterarAlvo}
          onFechar={() => setAlterarAlvo(null)}
          onSucesso={() => {
            setAlterarAlvo(null);
            carregarAgendamentos();
            toast.success("Consulta remarcada com sucesso.");
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!cancelarAlvo}
        title="Cancelar Consulta"
        description={cancelarAlvo ? `Esta ação registrará o status como Cancelado para a consulta com ${cancelarAlvo ? (agendamentos.find(a => a.id === cancelarAlvo.id)?.nomeProfissional || cancelarAlvo.nome) : ""}.` : ""}
        confirmText="Sim, Cancelar"
        cancelText="Voltar"
        type="destructive"
        loading={cancelando}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelarAlvo(null)}
      />
    </div>
  );
}
