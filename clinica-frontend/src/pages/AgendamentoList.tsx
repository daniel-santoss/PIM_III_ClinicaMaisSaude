import { API_URL } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { perfis } from "../constants/perfis";
import { statusAgendamento } from "../constants/status";
import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { AlertTriangle, Calendar, TrendingUp, BarChart3, Plus, User, X, FileText, Mail, Phone, Pencil } from 'lucide-react';
import type { PacienteResponse } from "../types/PacienteResponse";
import AgendamentoFiltros from "../components/AgendamentoFiltros";
import AgendamentoFormCriar from "../components/AgendamentoFormCriar";
import ModalRemarcar from "../components/ModalRemarcar";
import ModalHistorico from "../components/ModalHistorico";
import ConfirmModal from "../components/ConfirmModal";
import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";
import AgendamentoVisualizador from "../components/AgendamentoVisualizador";


export interface AgendamentoResponse {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  medicoId: string;
  dataHoraConsulta: string;
  tipoProfissional: string;
  tipoConsulta: string;
  status: string;
  agendamentoOrigemId?: string;
  nomeProfissional: string;
  dtCriado: string;
  especialidade?: string;
  nivelProbabilidadeFalta?: string;
  probabilidadeFalta?: number;
  exigeResultadoPosterior?: boolean;
  resultadoDisponivel?: boolean;
  resultadoRetirado?: boolean;
  pacienteFotoBase64?: string;
  profissionalFotoBase64?: string;
}

export interface AgendamentoHistoricoResponse {
  id: string;
  agendamentoId: string;
  tipoEvento: string;
  statusAnterior?: string;
  statusNovo?: string;
  dataAnterior?: string;
  dataNova?: string;
  observacao?: string;
  realizadoPor: string;
  nomeRealizadoPor: string;
  dtCriado: string;
}

const EnumStatusUrl = {
  [statusAgendamento.agendado]: 0,
  [statusAgendamento.emAtendimento]: 1,
  [statusAgendamento.aguardandoRetorno]: 2,
  [statusAgendamento.retornoAgendado]: 3,
  [statusAgendamento.finalizado]: 4,
  [statusAgendamento.faltou]: 5,
  [statusAgendamento.cancelado]: 6
};


export default function AgendamentoList({ agendamentoDestaque }: { agendamentoDestaque?: string | null }) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshContador, setRefreshContador] = useState(0);

  const toast = useToast();
  const [cancelarAlvo, setCancelarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterarAlvo, setAlterarAlvo] = useState<AgendamentoResponse | null>(null);
  const [pacienteDetalhesModal, setPacienteDetalhesModal] = useState<PacienteResponse | null>(null);
  const [modalNovoAgendamento, setModalNovoAgendamento] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [historicoAtual, setHistoricoAtual] = useState<AgendamentoHistoricoResponse[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [concluirExameAlvo, setConcluirExameAlvo] = useState<AgendamentoResponse | null>(null);
  const [exigeResultadoPosterior, setExigeResultadoPosterior] = useState(false);
  const [concluindoExame, setConcluindoExame] = useState(false);
  const [dadosRetornoPreenchido, setDadosRetornoPreenchido] = useState<{
    pacienteId: string;
    pacienteNome: string;
    origemId: string;
    nomeProfissional: string;
    dataHoraOrigem: string;
  } | null>(null);

  useScrollBlock(!!pacienteDetalhesModal);

  const [filtroAgenda, setFiltroAgenda] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([
    statusAgendamento.agendado,
    statusAgendamento.emAtendimento,
    statusAgendamento.aguardandoRetorno,
    statusAgendamento.retornoAgendado,
    statusAgendamento.finalizado,
    statusAgendamento.faltou,
    statusAgendamento.cancelado
  ]);
  const [filtroDataConsulta, setFiltroDataConsulta] = useState(() => {
    const hojeObj = new Date();
    return `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`;
  });
  const [filtroRiscoApenas, setFiltroRiscoApenas] = useState(false);
  const [ordemData, setOrdemData] = useState<"asc" | "desc">("asc");
  const [modoExibicao, setModoExibicao] = useState<"tabela" | "agenda">("tabela");

  const tipoUsuario = localStorage.getItem(storageKeys.tipoUsuario);
  const isAdmin = localStorage.getItem(storageKeys.isAdmin) === "true";

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const limparFiltros = () => {
    setFiltroAgenda("");
    setStatusSelecionados([
      statusAgendamento.agendado,
      statusAgendamento.emAtendimento,
      statusAgendamento.aguardandoRetorno,
      statusAgendamento.retornoAgendado,
      statusAgendamento.finalizado,
      statusAgendamento.faltou,
      statusAgendamento.cancelado
    ]);
    setFiltroDataConsulta("");
    setFiltroRiscoApenas(false);
    setPage(1);
  };

  useEffect(() => { carregarDados(); }, [refreshContador, page, filtroAgenda, statusSelecionados, filtroDataConsulta, filtroRiscoApenas, ordemData]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("pageSize", pageSize.toString());
      queryParams.append("ordem", ordemData);
      if (filtroAgenda) queryParams.append("busca", filtroAgenda);
      if (filtroDataConsulta) queryParams.append("data", filtroDataConsulta);
      if (statusSelecionados.length > 0) queryParams.append("status", statusSelecionados.join(','));
      if (filtroRiscoApenas) queryParams.append("riscoAltoApenas", "true");

      const resA = await fetch(`${API_URL}/api/Agendamentos?${queryParams.toString()}`, { headers });
      if (!resA.ok) throw new Error("Erro ao carregar dados do servidor.");
      
      const dataA = await resA.json();
      if (dataA.items) {
          setAgendamentos(dataA.items);
          setTotalCount(dataA.totalCount);
          setTotalPages(dataA.totalPages || Math.ceil(dataA.totalCount / pageSize));
      } else {
          setAgendamentos(dataA);
          setTotalCount(dataA.length);
          setTotalPages(1);
      }
    } catch (err: any) { setErro(err.message); }
    finally { setCarregando(false); }
  };

  const confirmarCancelamento = async () => {
    if (!cancelarAlvo) return;
    setCancelando(true);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Agendamentos/${cancelarAlvo.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(EnumStatusUrl[statusAgendamento.cancelado])
      });
      if (!response.ok) { 
        if (response.status === 400) toast.error(await response.text());
        return; 
      }
      toast.success("Consulta cancelada com sucesso.");
      setCancelarAlvo(null);
      setRefreshContador(p => p + 1);
    } catch (e) { toast.error("Erro de conexão ao remover agendamento."); }
    finally { setCancelando(false); }
  };

  const alterarStatus = async (id: string, novoStatusString: string) => {
    const valorEnum = EnumStatusUrl[novoStatusString as keyof typeof EnumStatusUrl];
    if (valorEnum === undefined) return;
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Agendamentos/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(valorEnum)
      });
      if (!response.ok) {
        if (response.status === 400) toast.error(await response.text());
        return;
      }
      toast.success("Status da consulta alterado.");
      setRefreshContador(p => p + 1);
    } catch (err) { toast.error("Falha de conexão."); }
  };

  const abrirHistorico = async (agendamentoId: string) => {
    setHistoricoLoading(true); setModalHistoricoAberto(true); setHistoricoAtual([]);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const resp = await fetch(`${API_URL}/api/Agendamentos/${agendamentoId}/historico`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) { setHistoricoAtual(await resp.json()); }
      else { 
        if (resp.status === 400) toast.error(await resp.text());
        setModalHistoricoAberto(false); 
      }
    } catch (error) { toast.error("Falha de conexão ao buscar histórico."); setModalHistoricoAberto(false); }
    finally { setHistoricoLoading(false); }
  };




  const concluirExame = async () => {
    if (!concluirExameAlvo) return;
    setConcluindoExame(true);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Agendamentos/${concluirExameAlvo.id}/concluir-exame`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(exigeResultadoPosterior)
      });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.mensagem || "Erro ao concluir exame.");
        return;
      }
      toast.success("Exame concluído com sucesso.");
      setConcluirExameAlvo(null);
      setExigeResultadoPosterior(false);
      setRefreshContador(p => p + 1);
    } catch { toast.error("Falha de conexão."); }
    finally { setConcluindoExame(false); }
  };

  const marcarResultadoDisponivel = async (id: string) => {
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Agendamentos/${id}/resultado-disponivel`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.mensagem || "Erro ao notificar resultado.");
        return;
      }
      toast.success("Paciente notificado sobre resultado pronto.");
      setRefreshContador(p => p + 1);
    } catch { toast.error("Falha de conexão."); }
  };

  const marcarResultadoRetirado = async (id: string) => {
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Agendamentos/${id}/resultado-retirado`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.mensagem || "Erro ao confirmar retirada.");
        return;
      }
      toast.success("Retirada de resultado confirmada.");
      setRefreshContador(p => p + 1);
    } catch { toast.error("Falha de conexão."); }
  };

  const agendamentosFiltrados = agendamentos;

  // Reset page to 1 when search filters change
  useEffect(() => {
    setPage(1);
  }, [filtroAgenda, statusSelecionados, filtroDataConsulta, filtroRiscoApenas]);

  useEffect(() => {
    if (agendamentoDestaque) {
      limparFiltros();
    }
  }, [agendamentoDestaque]);

  const hojeObj = new Date();
  const hoje = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`;
  const atendimentosHoje = agendamentos.filter(a => a.dataHoraConsulta.startsWith(hoje)).length;

  const statusResumo = {
    agendados: agendamentos.filter(a => a.status === statusAgendamento.agendado || a.status === statusAgendamento.retornoAgendado).length,
    finalizados: agendamentos.filter(a => a.status === statusAgendamento.finalizado).length,
    faltas: agendamentos.filter(a => a.status === statusAgendamento.faltou).length
  };

  const agendamentosHoje = agendamentos.filter(a => a.dataHoraConsulta.startsWith(hoje) && a.status === statusAgendamento.agendado);
  const riscoAltoHoje = agendamentosHoje.filter(a => a.nivelProbabilidadeFalta === "Alta").length;
  const riscoMedioHoje = agendamentosHoje.filter(a => a.nivelProbabilidadeFalta === "Média").length;



  if (erro) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-1">Ops! Algo deu errado</h3>
        <p className="text-red-600 text-sm">{erro}</p>
        <button onClick={() => setRefreshContador(v => v + 1)} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">Tentar Novamente</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-purple-100/20 border border-purple-50 group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-col sm:flex-row gap-1 sm:gap-0">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-xl sm:rounded-2xl text-purple-600 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 leading-tight">Atend. Hoje</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-4xl font-black text-gray-800 leading-none">{atendimentosHoje}</span>
              <div className="flex items-center gap-1 mb-1 px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full text-[9px] font-black">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>+12%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-blue-100/20 border border-blue-50 group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-col sm:flex-row gap-1 sm:gap-0">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />            </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 leading-tight">Dist. Mensal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-purple-500" style={{ width: `${(statusResumo.agendados / (statusResumo.agendados + statusResumo.finalizados + statusResumo.faltas || 1)) * 100}%` }}></div>
                <div className="bg-green-500" style={{ width: `${(statusResumo.finalizados / (statusResumo.agendados + statusResumo.finalizados + statusResumo.faltas || 1)) * 100}%` }}></div>
                <div className="bg-orange-500" style={{ width: `${(statusResumo.faltas / (statusResumo.agendados + statusResumo.finalizados + statusResumo.faltas || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <div className="flex flex-col items-center"><span className="text-[9px] font-black text-purple-600 uppercase">Agend.</span><span className="text-xs font-black text-gray-700">{statusResumo.agendados}</span></div>
              <div className="flex flex-col items-center"><span className="text-[9px] font-black text-green-600 uppercase">Fin.</span><span className="text-xs font-black text-gray-700">{statusResumo.finalizados}</span></div>
              <div className="flex flex-col items-center"><span className="text-[9px] font-black text-orange-600 uppercase">Faltas</span><span className="text-xs font-black text-gray-700">{statusResumo.faltas}</span></div>
            </div>
          </div>
          {(isAdmin || tipoUsuario === perfis.medico || tipoUsuario === perfis.enfermeira) && (
            <button 
              onClick={() => {
                const novoEstado = !filtroRiscoApenas;
                setFiltroRiscoApenas(novoEstado);
                if (novoEstado) {
                  setFiltroDataConsulta(hoje);
                  setStatusSelecionados([statusAgendamento.agendado]);
                } else {
                  limparFiltros();
                }
              }}
              className={`text-left p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl transition-all duration-300 group hover:scale-[1.02] ${
                filtroRiscoApenas 
                  ? 'bg-red-50 border-2 border-red-400 shadow-red-200' 
                  : 'bg-white border border-red-50 shadow-red-100/20'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-col sm:flex-row gap-1 sm:gap-0">
                <div className="p-2 sm:p-3 bg-red-100 rounded-xl sm:rounded-2xl text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 leading-tight">Risco Falta</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl sm:text-4xl font-black text-gray-800 leading-none">{riscoAltoHoje + riscoMedioHoje}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-red-400 mb-1 hidden sm:inline">{riscoAltoHoje} Alto</span>
              </div>
            </button>
          )}
        </div>

        {/* Filtros */}
        <AgendamentoFiltros
          filtroAgenda={filtroAgenda} setFiltroAgenda={setFiltroAgenda}
          statusSelecionados={statusSelecionados} setStatusSelecionados={setStatusSelecionados}
          filtroDataConsulta={filtroDataConsulta} setFiltroDataConsulta={setFiltroDataConsulta}
          ordemData={ordemData} setOrdemData={setOrdemData}
          limparFiltros={limparFiltros}
          modoExibicao={modoExibicao} setModoExibicao={setModoExibicao}
        />

        {/* Modos de Exibição */}
        <div className={`space-y-10 ${carregando ? "animate-pulse" : ""}`}>
          {carregando ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded-2xl w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <AgendamentoVisualizador
              agendamentos={agendamentosFiltrados}
              modoExibicao={modoExibicao}
              ordemData={ordemData}
              tipoUsuario={tipoUsuario}
              isAdmin={isAdmin}
              agendamentoDestaque={agendamentoDestaque}
              onAlterarStatus={alterarStatus}
              onCancelar={(id, nome) => setCancelarAlvo({ id, nome })}
              onRemarcar={setAlterarAlvo}
              onHistorico={abrirHistorico}
              onConcluirExame={(agenda) => { setConcluirExameAlvo(agenda); setExigeResultadoPosterior(false); }}
              onAgendarRetorno={(agenda) => {
                setDadosRetornoPreenchido({
                  pacienteId: agenda.pacienteId,
                  pacienteNome: agenda.pacienteNome,
                  origemId: agenda.id,
                  nomeProfissional: agenda.nomeProfissional,
                  dataHoraOrigem: agenda.dataHoraConsulta,
                });
              }}
              onMarcarResultadoDisponivel={marcarResultadoDisponivel}
              onMarcarResultadoRetirado={marcarResultadoRetirado}
            />
          )}
        </div>

        {/* Footer / Paginação */}
        <div className="px-6 py-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Exibindo {agendamentosFiltrados.length} de {totalCount} {totalCount === 1 ? "resultado" : "resultados"}
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-bold border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:text-purple-600 transition-colors bg-white shadow-sm"
              >
                Anterior
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  if (pNum === 1 || pNum === totalPages || (pNum >= page - 1 && pNum <= page + 1)) {
                    return (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-colors border shadow-sm ${
                          page === pNum 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  if (pNum === page - 2 || pNum === page + 2) {
                    return <span key={pNum} className="text-gray-400 text-xs px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-bold border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:text-purple-600 transition-colors bg-white shadow-sm"
              >
                Próximo
              </button>
            </div>
          )}
        </div>

        {/* FAB */}
        {(tipoUsuario !== perfis.medico || isAdmin) && (
          <button
            onClick={() => setModalNovoAgendamento(true)}
            className="fixed bottom-8 right-8 w-16 h-16 bg-[#7C3AED] text-white rounded-full shadow-2xl shadow-purple-400/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
          >
            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
            <span className="absolute right-20 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Novo Agendamento</span>
          </button>
        )}
      </div>

      {/* Modais via componentes extraidos */}
      {(modalNovoAgendamento || dadosRetornoPreenchido) && (
        <AgendamentoFormCriar
          dadosRetorno={dadosRetornoPreenchido}
          onFechar={() => {
            setModalNovoAgendamento(false);
            setDadosRetornoPreenchido(null);
          }}
          onCriado={() => {
            setModalNovoAgendamento(false);
            setDadosRetornoPreenchido(null);
            setRefreshContador(p => p + 1);
          }}
        />
      )}

      {alterarAlvo && (
        <ModalRemarcar
          agenda={alterarAlvo}
          onFechar={() => setAlterarAlvo(null)}
          onSucesso={() => { setAlterarAlvo(null); setRefreshContador(p => p + 1); toast.success("Consulta remarcada com sucesso."); }}
        />
      )}

      {modalHistoricoAberto && (
        <ModalHistorico
          historico={historicoAtual}
          loading={historicoLoading}
          onFechar={() => setModalHistoricoAberto(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!cancelarAlvo}
        title="Cancelar Consulta"
        description={cancelarAlvo ? `Esta ação registrará o status como Cancelado para a consulta de ${cancelarAlvo.nome}.` : ''}
        confirmText="Sim, Cancelar"
        cancelText="Voltar"
        type="destructive"
        loading={cancelando}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelarAlvo(null)}
      />

      {concluirExameAlvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <h3 className="text-lg font-black text-gray-900">Concluir Exame</h3>
            <p className="text-sm text-gray-500">
              Paciente: <span className="font-bold text-gray-800">{concluirExameAlvo.pacienteNome}</span>
            </p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exigeResultadoPosterior}
                onChange={e => setExigeResultadoPosterior(e.target.checked)}
                className="w-5 h-5 rounded accent-purple-600"
              />
              <span className="text-sm font-semibold text-gray-700">O resultado será entregue posteriormente</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => { setConcluirExameAlvo(null); setExigeResultadoPosterior(false); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={concluirExame}
                disabled={concluindoExame}
                className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {concluindoExame ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes Paciente */}
      {pacienteDetalhesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-purple-100">
            <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Paciente
              </h3>
              <button onClick={() => setPacienteDetalhesModal(null)} className="hover:bg-purple-500 p-1 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
                  {pacienteDetalhesModal.fotoBase64 ? (
                    <img src={pacienteDetalhesModal.fotoBase64} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    pacienteDetalhesModal.nome.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{pacienteDetalhesModal.nome}</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full uppercase tracking-wider">Paciente Ativo</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><FileText className="w-5 h-5" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">CPF</p><p className="text-sm font-medium text-gray-700">{mascaraCpf(pacienteDetalhesModal.cpf)}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Mail className="w-5 h-5" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">E-mail</p><p className="text-sm font-medium text-gray-700">{pacienteDetalhesModal.email || 'Não informado'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Phone className="w-5 h-5" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Telefone</p><p className="text-sm font-medium text-gray-700">{mascaraTelefone(pacienteDetalhesModal.telefone)}</p></div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => { setPacienteDetalhesModal(null); window.dispatchEvent(new CustomEvent("editarPacienteGlobal", { detail: pacienteDetalhesModal })); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar Dados
                </button>
                <button onClick={() => setPacienteDetalhesModal(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition-all active:scale-95">Fechar Detalhes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
