import { API_URL } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { perfis } from "../constants/perfis";
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
  const pacienteId = localStorage.getItem(storageKeys.pacienteId);
  const token = localStorage.getItem(storageKeys.authToken);

  const STATUS_PADRAO = [
    "Agendado",
    "EmAtendimento",
    "AguardandoRetorno",
    "RetornoAgendado",
    "Finalizado",
    "Faltou",
    "Cancelado"
  ];

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
      const res = await fetch(`${API_URL}/api/Agendamentos?pageSize=1000&ordem=${ordemData}`, {
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
  }, [pacienteId, token, ordemData]);

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <button
          onClick={onNovoAgendamento}
          className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo agendamento
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
          <div className="w-10 h-10 border-[3px] border-line border-t-brand-600 rounded-full animate-spin"></div>
          <p className="text-muted text-[13px] font-medium">Carregando suas consultas...</p>
        </div>
      ) : agendamentos.length > 0 ? (
        <>
          <AgendamentoVisualizador
            agendamentos={agendamentosFiltrados}
            modoExibicao={modoExibicao}
            ordemData={ordemData}
            tipoUsuario={perfis.paciente}
            agendamentoDestaque={agendamentoDestaque}
            onCancelar={(id, nome) => setCancelarAlvo({ id, nome })}
            onRemarcar={(agenda) => setAlterarAlvo(agenda)}
          />
          
          <div className="px-5 py-3 bg-canvas rounded-md border border-line">
            <p className="text-xs font-medium text-muted">
              Exibindo {agendamentosFiltrados.length} de {agendamentos.length} {agendamentos.length === 1 ? "consulta" : "consultas"}
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-line">
          <div className="w-14 h-14 bg-canvas rounded-lg grid place-items-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-muted" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">Nenhum agendamento encontrado</h3>
          <p className="text-muted text-sm mb-6">Você ainda não possui consultas marcadas no sistema.</p>
          <button onClick={onNovoAgendamento} className="h-10 px-4 inline-flex items-center rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors">Marcar primeira consulta</button>
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
