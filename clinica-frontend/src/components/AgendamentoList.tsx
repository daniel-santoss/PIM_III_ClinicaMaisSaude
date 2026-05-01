import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import type { PacienteResponse } from "../types/PacienteResponse";
import AgendamentoCard from "./AgendamentoCard";
import AgendamentoFiltros from "./AgendamentoFiltros";
import AgendamentoFormCriar from "./AgendamentoFormCriar";
import ModalRemarcar from "./ModalRemarcar";
import ModalHistorico from "./ModalHistorico";

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
  "Agendado": 0, "EmAtendimento": 1, "AguardandoRetorno": 2,
  "RetornoAgendado": 3, "Finalizado": 4, "Faltou": 5, "Cancelado": 6
};

const StatusPriority: Record<string, number> = {
  "EmAtendimento": 1, "Agendado": 2, "RetornoAgendado": 3,
  "AguardandoRetorno": 4, "Faltou": 5, "Finalizado": 6, "Cancelado": 7
};

export default function AgendamentoList() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([]);
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshContador, setRefreshContador] = useState(0);

  const [modalMensagem, setModalMensagem] = useState<string | null>(null);
  const [cancelarAlvo, setCancelarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterarAlvo, setAlterarAlvo] = useState<AgendamentoResponse | null>(null);
  const [pacienteDetalhesModal, setPacienteDetalhesModal] = useState<PacienteResponse | null>(null);
  const [modalNovoAgendamento, setModalNovoAgendamento] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [historicoAtual, setHistoricoAtual] = useState<AgendamentoHistoricoResponse[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  const [filtroAgenda, setFiltroAgenda] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroDataConsulta, setFiltroDataConsulta] = useState("");
  const [ordemData, setOrdemData] = useState<"asc" | "desc">("desc");

  const limparFiltros = () => { setFiltroAgenda(""); setFiltroStatus("Todos"); setFiltroDataConsulta(""); };

  useEffect(() => { carregarDados(); }, [refreshContador]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers = { "Authorization": `Bearer ${token}` };
      const [resA, resP] = await Promise.all([
        fetch("http://localhost:5045/api/Agendamentos", { headers }),
        fetch("http://localhost:5045/api/Pacientes", { headers })
      ]);
      if (!resA.ok || !resP.ok) throw new Error("Erro ao carregar dados do servidor.");
      setAgendamentos(await resA.json());
      setPacientes(await resP.json());
    } catch (err: any) { setErro(err.message); }
    finally { setCarregando(false); }
  };

  const confirmarCancelamento = async () => {
    if (!cancelarAlvo) return;
    setCancelando(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${cancelarAlvo.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(EnumStatusUrl["Cancelado"])
      });
      if (!response.ok) { setModalMensagem(await response.text()); return; }
      setCancelarAlvo(null);
      setRefreshContador(p => p + 1);
    } catch (e) { setModalMensagem("Erro de conexão ao remover agendamento."); }
    finally { setCancelando(false); }
  };

  const alterarStatus = async (id: string, novoStatusString: string) => {
    const valorEnum = EnumStatusUrl[novoStatusString as keyof typeof EnumStatusUrl];
    if (valorEnum === undefined) return;
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(valorEnum)
      });
      if (!response.ok) setModalMensagem(await response.text());
      setRefreshContador(p => p + 1);
    } catch (err) { setModalMensagem("Falha de conexão."); }
  };

  const abrirHistorico = async (agendamentoId: string) => {
    setHistoricoLoading(true); setModalHistoricoAberto(true); setHistoricoAtual([]);
    try {
      const token = localStorage.getItem("authToken");
      const resp = await fetch(`http://localhost:5045/api/Agendamentos/${agendamentoId}/historico`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) { setHistoricoAtual(await resp.json()); }
      else { setModalMensagem(await resp.text()); setModalHistoricoAberto(false); }
    } catch (error) { setModalMensagem("Falha de conexão ao buscar histórico."); setModalHistoricoAberto(false); }
    finally { setHistoricoLoading(false); }
  };

  const obterOpcoesPermitidas = (statusAtual: string, tipoConsulta: string): string[] => {
    switch (statusAtual) {
      case "Agendado": return ["EmAtendimento", "Faltou"];
      case "EmAtendimento":
        return tipoConsulta === "ConsultaMédica" || tipoConsulta === "Consulta Médica" ? ["AguardandoRetorno", "Finalizado"] : ["Finalizado"];
      case "AguardandoRetorno": return [];
      case "RetornoAgendado": return ["Finalizado", "Faltou"];
      default: return [];
    }
  };

  const agendamentosFiltrados = agendamentos
    .filter(a => {
      const pac = pacientes.find(p => p.id === a.pacienteId);
      const cpf = pac ? pac.cpf : "";
      const matchBusca = a.pacienteNome.toLowerCase().includes(filtroAgenda.toLowerCase()) || cpf.includes(filtroAgenda);
      const matchStatus = filtroStatus === "Todos" || a.status === filtroStatus;
      const matchData = !filtroDataConsulta || a.dataHoraConsulta.startsWith(filtroDataConsulta);
      return matchBusca && matchStatus && matchData;
    })
    .sort((a, b) => {
      const pA = StatusPriority[a.status] || 99;
      const pB = StatusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      const dA = new Date(a.dataHoraConsulta).getTime();
      const dB = new Date(b.dataHoraConsulta).getTime();
      return ordemData === "desc" ? dB - dA : dA - dB;
    });

  const hoje = new Date().toISOString().split('T')[0];
  const atendimentosHoje = agendamentos.filter(a => a.dataHoraConsulta.startsWith(hoje)).length;
  const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const faltasSemana = agendamentos.filter(a => a.status === "Faltou" && new Date(a.dataHoraConsulta) >= seteDiasAtras).length;
  const totalSemana = agendamentos.filter(a => new Date(a.dataHoraConsulta) >= seteDiasAtras).length;
  const taxaAbsenteismo = totalSemana > 0 ? Math.round((faltasSemana / totalSemana) * 100) : 0;
  const statusResumo = {
    agendados: agendamentos.filter(a => a.status === "Agendado" || a.status === "RetornoAgendado").length,
    finalizados: agendamentos.filter(a => a.status === "Finalizado").length,
    faltas: agendamentos.filter(a => a.status === "Faltou").length
  };

  if (erro) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center max-w-md">
        <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h3 className="text-lg font-bold text-red-800 mb-1">Ops! Algo deu errado</h3>
        <p className="text-red-600 text-sm">{erro}</p>
        <button onClick={() => setRefreshContador(v => v + 1)} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">Tentar Novamente</button>
      </div>
    </div>
  );

  if (carregando) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p className="text-purple-600 font-black uppercase tracking-widest text-xs">Carregando Agenda...</p>
    </div>
  );

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-purple-100/20 border border-purple-50 group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Atendimentos Hoje</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-gray-800 leading-none">{atendimentosHoje}</span>
              <div className="flex items-center gap-1 mb-1 px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[10px] font-black">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path></svg>
                <span>+12%</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-orange-100/20 border border-orange-50 group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Absenteísmo (Semana)</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-gray-800 leading-none">{taxaAbsenteismo}%</span>
              <span className="text-[10px] font-bold text-orange-400 mb-1">{faltasSemana} faltas totais</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-blue-100/20 border border-blue-50 group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Distribuição Mensal</span>
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
        </div>

        {/* Filtros */}
        <AgendamentoFiltros
          filtroAgenda={filtroAgenda} setFiltroAgenda={setFiltroAgenda}
          filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
          filtroDataConsulta={filtroDataConsulta} setFiltroDataConsulta={setFiltroDataConsulta}
          ordemData={ordemData} setOrdemData={setOrdemData}
          limparFiltros={limparFiltros}
        />

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agendamentosFiltrados.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-dashed border-purple-200 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum agendamento para exibir</p>
            </div>
          ) : (
            agendamentosFiltrados.map((agenda) => (
              <AgendamentoCard
                key={agenda.id}
                agenda={agenda}
                opcoesValidas={obterOpcoesPermitidas(agenda.status, agenda.tipoConsulta)}
                podeCancelar={agenda.status === "Agendado" || agenda.status === "RetornoAgendado"}
                podeRemarcar={agenda.status !== "Finalizado" && agenda.status !== "Cancelado"}
                onAlterarStatus={alterarStatus}
                onCancelar={(id, nome) => setCancelarAlvo({ id, nome })}
                onRemarcar={(a) => setAlterarAlvo(a)}
                onHistorico={abrirHistorico}
              />
            ))
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setModalNovoAgendamento(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#7C3AED] text-white rounded-full shadow-2xl shadow-purple-400/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        >
          <svg className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          <span className="absolute right-20 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Novo Agendamento</span>
        </button>
      </div>

      {/* Modais via componentes extraidos */}
      {modalNovoAgendamento && (
        <AgendamentoFormCriar
          pacientes={pacientes}
          agendamentos={agendamentos}
          onFechar={() => setModalNovoAgendamento(false)}
          onCriado={() => { setModalNovoAgendamento(false); setRefreshContador(p => p + 1); }}
          onMensagem={setModalMensagem}
        />
      )}

      {alterarAlvo && (
        <ModalRemarcar
          agenda={alterarAlvo}
          onFechar={() => setAlterarAlvo(null)}
          onSucesso={() => { setAlterarAlvo(null); setRefreshContador(p => p + 1); }}
          onMensagem={setModalMensagem}
        />
      )}

      {modalHistoricoAberto && (
        <ModalHistorico
          historico={historicoAtual}
          loading={historicoLoading}
          onFechar={() => setModalHistoricoAberto(false)}
        />
      )}

      {/* Modal Mensagem */}
      {modalMensagem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Aviso</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{modalMensagem}</p>
            <button className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100" onClick={() => setModalMensagem(null)}>Entendido</button>
          </div>
        </div>
      )}

      {/* Modal Cancelar */}
      {cancelarAlvo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in zoom-in duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center border-t-4 border-red-500">
            <h3 className="text-lg font-bold text-red-600 mb-2 mt-2">Cancelar Consulta</h3>
            <p className="text-sm text-gray-700 mb-6">
              Esta ação registrará o status como <strong>Cancelado</strong> para a consulta de <strong>{cancelarAlvo.nome}</strong>.
            </p>
            <div className="flex gap-2">
              <button disabled={cancelando} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 text-sm font-semibold rounded" onClick={() => setCancelarAlvo(null)}>Voltar</button>
              <button disabled={cancelando} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold rounded" onClick={confirmarCancelamento}>{cancelando ? '...' : 'Sim, Cancelar'}</button>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                Dados do Paciente
              </h3>
              <button onClick={() => setPacienteDetalhesModal(null)} className="hover:bg-purple-500 p-1 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                  {pacienteDetalhesModal.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{pacienteDetalhesModal.nome}</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full uppercase tracking-wider">Paciente Ativo</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-4 0a1 1 0 011 1v3M6 7H6a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1V7a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1V7"></path></svg></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">CPF</p><p className="text-sm font-medium text-gray-700">{mascaraCpf(pacienteDetalhesModal.cpf)}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">E-mail</p><p className="text-sm font-medium text-gray-700">{pacienteDetalhesModal.email || 'Não informado'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Telefone</p><p className="text-sm font-medium text-gray-700">{mascaraTelefone(pacienteDetalhesModal.telefone)}</p></div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => { setPacienteDetalhesModal(null); window.dispatchEvent(new CustomEvent("editarPacienteGlobal", { detail: pacienteDetalhesModal })); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
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
