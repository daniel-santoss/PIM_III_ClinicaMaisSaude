import { Settings, User, LogOut, X, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { CLINIC_NAME, API_URL } from "./constants/api";
import { useState, useEffect } from "react";
import PacienteList from "./components/PacienteList";
import AgendamentoList from "./components/AgendamentoList";
import Login from "./components/Login";
import { CadastroUsuario } from "./components/CadastroUsuario";
import AgendamentoPaciente from "./components/AgendamentoPaciente";
import MeusAgendamentos from "./components/MeusAgendamentos";
import PerfilPaciente from "./components/PerfilPaciente";
import PerfilMedico from "./components/PerfilMedico";
import ViolacoesList from "./components/ViolacoesList";
import type { PacienteResponse } from "./types/PacienteResponse";
import { useScrollBlock } from "./hooks/useScrollBlock";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
  lida: boolean;
  dtCriado: string;
};

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"pacientes" | "agendamentos" | "cadastro" | "violacoes">("agendamentos");
  const [viewPaciente, setViewPaciente] = useState<"novo" | "lista">("novo");
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [menuDropdownAberto, setMenuDropdownAberto] = useState(false);
  const [notificacoesDropdownAberto, setNotificacoesDropdownAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [agendamentoDestaque, setAgendamentoDestaque] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const tipo = localStorage.getItem("tipoUsuario");
    const admin = localStorage.getItem("isAdmin") === "true";
    if (token) {
      setAutenticado(true);
      setTipoUsuario(tipo || "Paciente");
      setIsAdmin(admin);
      setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");
      // Não chamar fetchNotificacoes() aqui — o useEffect de [autenticado] cuida disso
    }
  }, []);

  const fetchNotificacoes = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/Notificacoes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  useEffect(() => {
    if (!autenticado) return;
    fetchNotificacoes(); // Chamada inicial imediata após o login
    const interval = setInterval(fetchNotificacoes, 60000);
    return () => clearInterval(interval);
  }, [autenticado]);

  const handleMarcarComoLida = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/Notificacoes/${id}/lida`, { 
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoverNotificacao = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/Notificacoes/${id}`, { 
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (res.ok) {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavegacaoNotificacao = (n: Notificacao) => {
    if (!n.lida) handleMarcarComoLida(n.id);
    setNotificacoesDropdownAberto(false);

    if (n.agendamentoId) {
      setAgendamentoDestaque(n.agendamentoId);
      setAbaAtiva('agendamentos');
      if (tipoUsuario === 'Paciente') {
        setViewPaciente('lista');
      }
      // Limpa o destaque após 5.5s (margem após a animação de 5s)
      setTimeout(() => setAgendamentoDestaque(null), 5500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("profissionalId");
    setAutenticado(false);
    setMenuDropdownAberto(false);
  };
  useScrollBlock(modalPerfilAberto);

  const [recarregarUsuarios, setRecarregarUsuarios] = useState(0);

  const [pacienteParaEditar, setPacienteParaEditar] = useState<PacienteResponse | null>(null);

  useEffect(() => {
    const handleEditar = (e: CustomEvent<PacienteResponse>) => {
      setPacienteParaEditar(e.detail);
      setAbaAtiva("pacientes");
    };
    window.addEventListener("editarPacienteGlobal", handleEditar as EventListener);
    return () => window.removeEventListener("editarPacienteGlobal", handleEditar as EventListener);
  }, []);

  if (!autenticado) {
    return <Login onLogado={() => {
      setAutenticado(true);
      const tipo = localStorage.getItem("tipoUsuario");
      const admin = localStorage.getItem("isAdmin") === "true";
      setTipoUsuario(tipo || "Paciente");
      setIsAdmin(admin);
      setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");
    }} />
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800">{CLINIC_NAME}</h1>
        <div className="flex items-center gap-4">
          {/* Sino de Notificações */}
          <div className="relative">
            <button
              onClick={() => { setNotificacoesDropdownAberto(!notificacoesDropdownAberto); setMenuDropdownAberto(false); }}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notificações"
            >
              <Bell size={24} />
              {notificacoes.filter(n => !n.lida).length > 0 && (
                <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notificacoes.filter(n => !n.lida).length}
                </span>
              )}
            </button>

            {notificacoesDropdownAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificacoesDropdownAberto(false)}></div>
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 custom-scrollbar">
                  <h3 className="font-bold text-gray-800 px-3 py-2 border-b">Notificações</h3>
                  {notificacoes.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500 text-center">Nenhuma notificação</p>
                  ) : (
                    <ul className="flex flex-col gap-1 mt-2">
                      {notificacoes.map(n => (
                        <li
                          key={n.id}
                          className={`p-3 rounded-xl border ${n.lida ? 'bg-gray-50 border-transparent' : 'bg-blue-50/30 border-blue-100'} ${n.agendamentoId ? 'cursor-pointer hover:bg-blue-100/40 transition-colors' : ''}`}
                        >
                          {/* Parte clícavel (título + mensagem) */}
                          <div
                            className="flex-1"
                            onClick={() => n.agendamentoId && handleNavegacaoNotificacao(n)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={`text-sm ${n.lida ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>{n.titulo}</h4>
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                {!n.lida && (
                                  <button onClick={() => handleMarcarComoLida(n.id)} className="text-gray-400 hover:text-blue-600" title="Marcar como lida">
                                    <CheckCheck size={16} />
                                  </button>
                                )}
                                <button onClick={() => handleRemoverNotificacao(n.id)} className="text-gray-400 hover:text-red-500" title="Remover">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <p className={`text-xs ${n.lida ? 'text-gray-500' : 'text-gray-700'}`}>{n.mensagem}</p>
                            {n.agendamentoId && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mt-1 block">Ver agendamento →</span>
                            )}
                            <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.dtCriado).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setMenuDropdownAberto(!menuDropdownAberto); setNotificacoesDropdownAberto(false); }}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-gray-200 bg-white shadow-sm font-bold text-sm"
              aria-label="Menu de configurações"
            >
            Configurações
            <Settings size={20} />
          </button>

          {menuDropdownAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuDropdownAberto(false)}></div>
              <nav className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-2" aria-label="Menu do usuário">
                <ul className="flex flex-col gap-1">
                  <li>
                    <button
                      onClick={() => { setModalPerfilAberto(true); setMenuDropdownAberto(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3"
                    >
                      <User size={20} />
                      Meu Perfil
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                    >
                      <LogOut size={20} />
                      Sair
                    </button>
                  </li>
                </ul>
              </nav>
            </>
          )}
        </div>
        </div>
      </header>

      {/* Abas de Navegação */}
      <nav className="flex space-x-1 border-b border-gray-200 mb-8" aria-label="Navegação principal">
        {tipoUsuario !== "Paciente" && (
          <button
            onClick={() => setAbaAtiva("pacientes")}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${abaAtiva === "pacientes"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
          >
            {isAdmin ? "Usuários" : "Pacientes"}
          </button>
        )}
        <button
          onClick={() => setAbaAtiva("agendamentos")}
          className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${abaAtiva === "agendamentos"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          Agendamentos
        </button>

        {isAdmin && (
          <button
            onClick={() => setAbaAtiva("violacoes")}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${abaAtiva === "violacoes"
                ? "border-red-600 text-red-600 bg-red-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
          >
            Violações IA
          </button>
        )}

        {tipoUsuario === "Paciente" && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => { setAbaAtiva("agendamentos"); setViewPaciente(viewPaciente === "novo" ? "lista" : "novo"); }}
              className="px-4 py-2 bg-purple-50 text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100 hover:bg-purple-100 transition-all"
            >
              {viewPaciente === "novo" ? "Ver Minhas Consultas" : "Marcar Nova Consulta"}
            </button>
          </div>
        )}
      </nav>

      <main>
        {abaAtiva === "violacoes" && (
          <section aria-label="Auditoria de IA">
            <ViolacoesList />
          </section>
        )}

        {/* Conteúdo da Aba: Pacientes */}
        {abaAtiva === "pacientes" && (
          <section aria-label="Gerenciamento de pacientes">
            <div className="mb-8">
              <CadastroUsuario onUserCreated={() => setRecarregarUsuarios((prev) => prev + 1)} />
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {isAdmin ? "Usuários Cadastrados" : "Pacientes Cadastrados"}
            </h2>
            <PacienteList
              recarregarContador={recarregarUsuarios}
              pacienteInicialEdicao={pacienteParaEditar}
              onFinalizouEdicaoExterno={() => setPacienteParaEditar(null)}
            />
          </section>
        )}

        {/* Conteúdo da Aba: Agendamentos */}
        {abaAtiva === "agendamentos" && (
          <section aria-label="Gerenciamento de agendamentos">
            {tipoUsuario === "Paciente" ? (
              viewPaciente === "novo" ? (
                <AgendamentoPaciente onSucesso={() => setViewPaciente("lista")} />
              ) : (
                <MeusAgendamentos onNovoAgendamento={() => setViewPaciente("novo")} agendamentoDestaque={agendamentoDestaque} />
              )
            ) : <AgendamentoList agendamentoDestaque={agendamentoDestaque} />}
          </section>
        )}
      </main>

      {/* Modal de Perfil/Configurações */}
      {modalPerfilAberto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-label="Perfil do usuário">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative flex flex-col p-2">
            <button
              onClick={() => setModalPerfilAberto(false)}
              className="absolute right-8 top-8 p-3 bg-white text-gray-400 hover:text-red-500 rounded-2xl shadow-md transition-all z-[160]"
              aria-label="Fechar perfil"
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 scroll-smooth">
              <div className="p-4 md:p-8">
                {tipoUsuario === "Medico" || tipoUsuario === "Enfermeira" ? <PerfilMedico /> : <PerfilPaciente />}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}