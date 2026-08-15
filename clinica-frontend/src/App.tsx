import { X, CalendarDays } from 'lucide-react';
import * as signalR from "@microsoft/signalr";
import { API_URL } from "./constants/api";
import { perfis } from "./constants/perfis";
import { storageKeys } from "./constants/storage";
import { useState, useEffect } from "react";
import AppLayout from "./components/AppLayout";
import PacienteList from "./pages/PacienteList";
import AgendamentoList from "./pages/AgendamentoList";
import Login from "./pages/Login";
import { CadastroUsuario } from "./pages/CadastroUsuario";
import AgendamentoPaciente from "./pages/AgendamentoPaciente";
import MeusAgendamentos from "./pages/MeusAgendamentos";
import PerfilPaciente from "./components/PerfilPaciente";
import PerfilMedico from "./components/PerfilMedico";
import ViolacoesList from "./pages/ViolacoesList";
import Relatorios from "./pages/Relatorios";
import type { PacienteResponse } from "./types/PacienteResponse";
import { useScrollBlock } from "./hooks/useScrollBlock";
import HomePage from "./pages/HomePage";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
  link: string | null;
  lida: boolean;
  dtCriado: string;
};

// Aba ativa — inclui "painel" (reservado para uso futuro) sem quebrar nada
type AbaAtiva = "painel" | "pacientes" | "agendamentos" | "minhas-consultas" | "violacoes" | "relatorios";

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [isVerificandoAuth, setIsVerificandoAuth] = useState(true);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("agendamentos");
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [agendamentoDestaque, setAgendamentoDestaque] = useState<string | null>(null);
  const [buscaViolacao, setBuscaViolacao] = useState("");
  const [modalAvisoCancelamento, setModalAvisoCancelamento] = useState(false);
  const [avisoCancelamentoMsg, setAvisoCancelamentoMsg] = useState("");
  const [dadosReagendamentoPrePreenchidos, setDadosReagendamentoPrePreenchidos] = useState<{
    tipoProfissional: number;
    tipoConsulta: number;
    especialidade: string;
  } | null>(null);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState<any[]>([]);
  const [carregandoCancelados, setCarregandoCancelados] = useState(false);
  const [canceladosExpandido, setCanceladosExpandido] = useState(true);

  const mapTipoProfissional = (tipo: string) => {
    return tipo === perfis.medico || tipo === "Médico" ? 1 : 0;
  };

  const mapTipoConsulta = (tipo: string) => {
    if (tipo === "Triagem") return 0;
    if (tipo === "Exame") return 1;
    if (tipo === "Vacina") return 2;
    if (tipo === "Retorno") return 4;
    return 3;
  };

  useEffect(() => {
    if (!modalAvisoCancelamento) {
      setAgendamentosCancelados([]);
      return;
    }

    const buscarCancelados = async () => {
      setCarregandoCancelados(true);
      try {
        const ids = notificacoes
          .filter(n => n.link?.startsWith('aviso-cancelamento-banimento'))
          .map(n => {
            if (!n.link) return null;
            const [, query] = n.link.split('?');
            const params = new URLSearchParams(query || "");
            return params.get('agendamentoId') || n.agendamentoId;
          })
          .filter(id => !!id) as string[];

        const uniqueIds = Array.from(new Set(ids));
        const token = localStorage.getItem(storageKeys.authToken);

        const promessas = uniqueIds.map(async (id) => {
          try {
            const res = await fetch(`${API_URL}/api/Agendamentos/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              return await res.json();
            }
          } catch (e) {
            console.error(`Erro ao buscar agendamento ${id}:`, e);
          }
          return null;
        });

        const resultados = await Promise.all(promessas);
        setAgendamentosCancelados(resultados.filter(a => a !== null));
      } catch (err) {
        console.error("Erro ao buscar agendamentos cancelados:", err);
      } finally {
        setCarregandoCancelados(false);
      }
    };

    buscarCancelados();
  }, [modalAvisoCancelamento, notificacoes]);

  useEffect(() => {
    const handler = () => {
      localStorage.clear();
      localStorage.setItem(storageKeys.violacaoDetectada, "true");
      setAutenticado(false);
      window.location.href = "/login";
    };
    window.addEventListener("segurancaViolada", handler);
    return () => window.removeEventListener("segurancaViolada", handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(storageKeys.authToken);
    const tipo = localStorage.getItem(storageKeys.tipoUsuario);
    const admin = localStorage.getItem(storageKeys.isAdmin) === "true";
    
    if (token) {
      setAutenticado(true);
      setTipoUsuario(tipo || perfis.paciente);
      setIsAdmin(admin);
      setAbaAtiva((tipo === perfis.paciente || tipo === perfis.medico) ? "agendamentos" : "pacientes");
      if (window.location.pathname === "/") {
        window.history.replaceState(null, "", "/app");
      }
    }
    setIsVerificandoAuth(false);
  }, []);

  const fetchNotificacoes = async () => {
    const token = localStorage.getItem(storageKeys.authToken);
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/Notificacoes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotificacoes(data);
      } else {
        console.warn('Falha ao buscar notificações:', response.status);
      }
    } catch (error) {
      console.error("Erro ao buscar notificações", error);
    }
  };

  // Notificações em tempo real via SignalR (substitui o antigo polling de 60s).
  // 1) Carrega o histórico uma vez (fetch inicial).
  // 2) Abre um canal WebSocket autenticado; cada "NovaNotificacao" entra na lista na hora.
  // 3) Reconexão automática; ao reconectar, re-sincroniza para não perder o que chegou no intervalo.
  // 4) Fallback: se o WebSocket não subir (proxy/rede), volta ao polling para não ficar sem notificações.
  useEffect(() => {
    if (!autenticado) return;

    fetchNotificacoes();

    let connection: signalR.HubConnection | null = null;
    let pollingFallback: ReturnType<typeof setInterval> | null = null;
    let cancelado = false;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notificacoes`, {
        accessTokenFactory: () => localStorage.getItem(storageKeys.authToken) || ""
      })
      .withAutomaticReconnect()
      .build();

    connection.on("NovaNotificacao", (notif: Notificacao) => {
      // Dedupe por id: evita duplicar se o fetch inicial e o push se cruzarem.
      setNotificacoes(prev => prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]);
    });

    // Após uma reconexão houve uma janela sem push; recarrega para cobrir o gap.
    connection.onreconnected(() => { fetchNotificacoes(); });

    connection.start().catch(() => {
      // Não conseguiu abrir o canal em tempo real: cai para o polling clássico.
      if (cancelado) return;
      pollingFallback = setInterval(fetchNotificacoes, 60000);
    });

    return () => {
      cancelado = true;
      if (pollingFallback) clearInterval(pollingFallback);
      connection?.stop();
    };
  }, [autenticado]);

  const handleMarcarComoLida = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/Notificacoes/${id}/lida`, {
        method: "PATCH",
        headers: { 'Authorization': `Bearer ${localStorage.getItem(storageKeys.authToken)}` }
      });
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      }
    } catch (e) { console.error(e); }
  };

  const handleRemoverNotificacao = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/Notificacoes/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${localStorage.getItem(storageKeys.authToken)}` }
      });
      if (res.ok) {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const handleNavegacaoNotificacao = (n: Notificacao) => {
    if (!n.lida) handleMarcarComoLida(n.id);
    
    if (n.link) {
      const [path, query] = n.link.split('?');
      const params = new URLSearchParams(query || "");
      if (path === 'violacoes') {
        const busca = params.get('busca');
        if (busca) {
          setBuscaViolacao(busca);
        }
        setAbaAtiva('violacoes');
      } else if (path === 'aviso-cancelamento-banimento') {
        setAvisoCancelamentoMsg(n.mensagem);
        setModalAvisoCancelamento(true);
      } else if (path === 'agendamentos') {
        const id = params.get('id');
        if (id) {
          setAgendamentoDestaque(id);
          if (tipoUsuario === perfis.paciente) {
            setAbaAtiva('minhas-consultas');
          } else {
            setAbaAtiva('agendamentos');
          }
          setTimeout(() => setAgendamentoDestaque(null), 5500);
        }
      }
    } else if (n.agendamentoId) {
      // Fallback para notificações legadas sem a coluna Link
      setAgendamentoDestaque(n.agendamentoId);
      if (tipoUsuario === perfis.paciente) {
        setAbaAtiva('minhas-consultas');
      } else {
        setAbaAtiva('agendamentos');
      }
      setTimeout(() => setAgendamentoDestaque(null), 5500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKeys.authToken);
    localStorage.removeItem(storageKeys.tipoUsuario);
    localStorage.removeItem(storageKeys.isAdmin);
    localStorage.removeItem(storageKeys.pacienteId);
    localStorage.removeItem(storageKeys.profissionalId);
    localStorage.removeItem(storageKeys.fotoBase64);
    setAutenticado(false);
    window.location.href = "/login"; // Força redirecionamento para o login ao sair
  };

  useScrollBlock(modalPerfilAberto || modalAvisoCancelamento);

  useEffect(() => {
    if (!autenticado || notificacoes.length === 0) return;
    const notificacaoAviso = notificacoes.find(n => !n.lida && n.link?.startsWith('aviso-cancelamento-banimento'));
    if (notificacaoAviso) {
      setAvisoCancelamentoMsg(notificacaoAviso.mensagem);
      setModalAvisoCancelamento(true);
      handleMarcarComoLida(notificacaoAviso.id);
    }
  }, [notificacoes, autenticado]);

  const [recarregarUsuarios, setRecarregarUsuarios] = useState(0);
  const [pacienteParaEditar, setPacienteParaEditar] = useState<PacienteResponse | null>(null);

  useEffect(() => {
    const handleEditar = (e: CustomEvent<PacienteResponse>) => {
      setPacienteParaEditar(e.detail);
      setAbaAtiva("pacientes");
    };
    const handleNavegarGlobal = (e: CustomEvent<string>) => {
      setAbaAtiva(e.detail as AbaAtiva);
    };
    window.addEventListener("editarPacienteGlobal", handleEditar as EventListener);
    window.addEventListener("navegarAbaGlobal", handleNavegarGlobal as EventListener);
    return () => {
      window.removeEventListener("editarPacienteGlobal", handleEditar as EventListener);
      window.removeEventListener("navegarAbaGlobal", handleNavegarGlobal as EventListener);
    };
  }, []);

  // ── Tela de Carregamento ───────────────────────────────────────────────────
  if (isVerificandoAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ── Tela de Login / HomePage Pública ──────────────────────────────────────────
  if (!autenticado) {
    // Definimos a Home como padrão para a raiz
    if (window.location.pathname === "/") {
      return <HomePage />;
    }

    return (
      <Login onLogado={() => {
        setAutenticado(true);
        const tipo = localStorage.getItem(storageKeys.tipoUsuario);
        const admin = localStorage.getItem(storageKeys.isAdmin) === "true";
        setTipoUsuario(tipo || perfis.paciente);
        setIsAdmin(admin);
        setAbaAtiva((tipo === perfis.paciente || tipo === perfis.medico) ? "agendamentos" : "pacientes");

        if (window.location.pathname === "/" || window.location.pathname === "/login") {
           window.history.replaceState(null, "", "/app");
        }
      }} />
    );
  }

  // ── App autenticado ────────────────────────────────────────────────────────
  return (
    <>
    <AppLayout
      tipoUsuario={tipoUsuario}
      isAdmin={isAdmin}
      abaAtiva={abaAtiva}
      notificacoes={notificacoes}
      onNavegar={(aba) => setAbaAtiva(aba as AbaAtiva)}
      onLogout={handleLogout}
      onAbrirPerfil={() => setModalPerfilAberto(true)}
      onMarcarLida={handleMarcarComoLida}
      onRemoverNotificacao={handleRemoverNotificacao}
      onNavegacaoNotificacao={handleNavegacaoNotificacao}
    >
      {/* ── Violações IA ─────────────────────────────────────────────────── */}
      {abaAtiva === "violacoes" && (
        <section aria-label="Auditoria de IA">
          <ViolacoesList buscaInicial={buscaViolacao} onLimparBusca={() => setBuscaViolacao("")} />
        </section>
      )}

      {/* ── Usuários / Pacientes ─────────────────────────────────────────── */}
      {abaAtiva === "pacientes" && (tipoUsuario === perfis.enfermeira || isAdmin) && (
        <section aria-label="Gerenciamento de pacientes">
          <div style={{ marginBottom: 32 }}>
            <CadastroUsuario tipoUsuarioLogado={tipoUsuario} onUserCreated={() => setRecarregarUsuarios((prev) => prev + 1)} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>
            {isAdmin ? "Usuários Cadastrados" : "Pacientes Cadastrados"}
          </h2>
          <PacienteList
            recarregarContador={recarregarUsuarios}
            pacienteInicialEdicao={pacienteParaEditar}
            onFinalizouEdicaoExterno={() => setPacienteParaEditar(null)}
          />
        </section>
      )}

      {/* ── Agendamentos ─────────────────────────────────────────────────── */}
      {abaAtiva === "agendamentos" && (
        <section aria-label="Gerenciamento de agendamentos">
          {tipoUsuario === perfis.paciente ? (
            <AgendamentoPaciente
              onSucesso={() => setAbaAtiva("minhas-consultas")}
              dadosPrePreenchidos={dadosReagendamentoPrePreenchidos}
              onLimparPrePreenchidos={() => setDadosReagendamentoPrePreenchidos(null)}
            />
          ) : (
            <AgendamentoList agendamentoDestaque={agendamentoDestaque} />
          )}
        </section>
      )}

      {/* ── Minhas Consultas (Histórico do Paciente) ───────────────────────── */}
      {abaAtiva === "minhas-consultas" && tipoUsuario === perfis.paciente && (
        <section aria-label="Minhas consultas">
          <MeusAgendamentos onNovoAgendamento={() => setAbaAtiva("agendamentos")} agendamentoDestaque={agendamentoDestaque} />
        </section>
      )}

      {/* ── Relatórios ────────────────────────────────────────────────────── */}
      {abaAtiva === "relatorios" && tipoUsuario !== perfis.paciente && (
        <section aria-label="Relatórios">
          <Relatorios />
        </section>
      )}

      {/* ── Modal de Perfil — bottom-sheet no mobile, centralizado no desktop ── */}
      {modalPerfilAberto && (
        <div
          className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-md p-0 sm:p-4"
          role="dialog" aria-modal="true" aria-label="Perfil do usuário"
          onClick={e => { if (e.target === e.currentTarget) setModalPerfilAberto(false); }}
        >
          <div className="bg-white w-full sm:max-w-3xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden border border-purple-50 relative">

            {/* Drag handle — mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Botão fechar */}
            <button
              onClick={() => setModalPerfilAberto(false)}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2.5 bg-white rounded-2xl shadow-md cursor-pointer text-gray-400 hover:text-red-500 transition-colors z-[160] flex items-center border-none"
              aria-label="Fechar perfil"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
              <div className="p-4 pt-5 sm:p-8 sm:pt-10">
                {/* Admin é respaldado por um perfil profissional ("Dr. Admin") e tem
                    profissionalId — vai no PerfilMedico. Sem isto, cairia no PerfilPaciente
                    e ficaria em spinner infinito (não tem pacienteId). */}
                {tipoUsuario === perfis.medico || tipoUsuario === perfis.enfermeira || tipoUsuario === perfis.admin
                  ? <PerfilMedico />
                  : <PerfilPaciente />
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Aviso Premium: Agendamento Cancelado ── */}
      {modalAvisoCancelamento && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-indigo-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl p-8 sm:p-10 text-center border border-indigo-100 animate-in zoom-in-95 duration-300 flex flex-col items-center relative max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Botão Fechar X */}
            <button
              onClick={() => setModalAvisoCancelamento(false)}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-full transition-colors cursor-pointer border-none flex items-center justify-center shadow-sm hover:shadow-md active:scale-95"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 shrink-0">
              <CalendarDays className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-indigo-900 mb-6 uppercase tracking-tight shrink-0">Comunicado Importante</h3>
            
            {/* Layout de duas colunas se houver consultas afetadas */}
            <div className={`grid grid-cols-1 ${agendamentosCancelados.length > 0 ? 'md:grid-cols-12' : ''} gap-6 w-full mb-8 text-left`}>
              
              {/* Coluna Esquerda: Textos Informativos */}
              <div className={`flex flex-col gap-4 ${agendamentosCancelados.length > 0 ? 'md:col-span-5' : ''}`}>
                <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-2xl h-full flex flex-col justify-between">
                  <p className="text-gray-700 text-sm font-semibold leading-relaxed">
                    {avisoCancelamentoMsg}
                  </p>
                  <div>
                    <div className="h-px bg-indigo-100/70 my-4" />
                    <p className="text-indigo-600 text-xs font-bold leading-relaxed">
                      {tipoUsuario === perfis.medico || tipoUsuario === perfis.enfermeira
                        ? "O paciente associado a estes agendamentos foi banido de forma permanente. As consultas listadas foram canceladas pelo sistema automaticamente."
                        : "Nossa prioridade máxima é a sua saúde e a segurança operacional das consultas. Sugerimos agendar uma nova consulta em nosso painel de marcações."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Consultas Afetadas */}
              {agendamentosCancelados.length > 0 && (
                <div className="flex flex-col md:col-span-7">
                  {carregandoCancelados ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-indigo-600 bg-indigo-50/30 border border-indigo-100/30 rounded-2xl h-full">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Carregando detalhes...</span>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl h-full flex flex-col overflow-hidden">
                      <button
                        onClick={() => setCanceladosExpandido(!canceladosExpandido)}
                        className="w-full p-4 bg-indigo-100/30 border-b border-indigo-100/50 font-bold text-xs text-indigo-900 uppercase tracking-wider cursor-pointer flex justify-between items-center select-none hover:bg-indigo-100/50 transition-colors border-none text-left"
                      >
                        <span>Consultas Afetadas ({agendamentosCancelados.length})</span>
                        <span className="text-[12px] text-indigo-500 font-black">
                          {canceladosExpandido ? "▲" : "▼"}
                        </span>
                      </button>
                      
                      {canceladosExpandido && (
                        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar max-h-[320px] transition-all duration-300">
                          {agendamentosCancelados.map((a) => {
                            const dataObj = new Date(a.dataHoraConsulta);
                            const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={a.id} className="p-4 bg-white rounded-xl border border-indigo-50 flex items-center justify-between gap-4 shadow-sm hover:border-indigo-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-black text-gray-800 leading-snug line-clamp-1">
                                    {tipoUsuario === perfis.medico || tipoUsuario === perfis.enfermeira ? `Paciente: ${a.pacienteNome}` : a.nomeProfissional}
                                  </h4>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">
                                    {a.tipoConsulta === "ConsultaMedica" && a.especialidade ? a.especialidade : a.tipoConsulta}
                                  </p>
                                  <p className="text-[10px] font-semibold text-indigo-600 mt-1">{dataStr}</p>
                                </div>
                                {!(tipoUsuario === perfis.medico || tipoUsuario === perfis.enfermeira) && (
                                  <button
                                    onClick={() => {
                                      setDadosReagendamentoPrePreenchidos({
                                        tipoProfissional: mapTipoProfissional(a.tipoProfissional),
                                        tipoConsulta: mapTipoConsulta(a.tipoConsulta),
                                        especialidade: a.especialidade || ""
                                      });
                                      setModalAvisoCancelamento(false);
                                      setAbaAtiva("agendamentos");
                                    }}
                                    className="px-4 py-2.5 bg-[#7C3AED] hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm border-none shrink-0"
                                  >
                                    Reagendar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            <button
              onClick={() => setModalAvisoCancelamento(false)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}
    </AppLayout>
    </>
  );
}