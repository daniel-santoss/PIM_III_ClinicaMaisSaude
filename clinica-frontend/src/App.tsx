import { X } from 'lucide-react';
import { CLINIC_NAME, API_URL } from "./constants/api";
import { useState, useEffect } from "react";
import AppLayout from "./components/AppLayout";
import PacienteList from "./components/PacienteList";
import AgendamentoList from "./components/AgendamentoList";
import Login from "./components/Login";
import { CadastroUsuario } from "./components/CadastroUsuario";
import AgendamentoPaciente from "./components/AgendamentoPaciente";
import MeusAgendamentos from "./components/MeusAgendamentos";
import PerfilPaciente from "./components/PerfilPaciente";
import PerfilMedico from "./components/PerfilMedico";
import ViolacoesList from "./components/ViolacoesList";
import Relatorios from "./pages/Relatorios";
import type { PacienteResponse } from "./types/PacienteResponse";
import { useScrollBlock } from "./hooks/useScrollBlock";
import HomePage from "./components/HomePage";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
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
  const [viewPaciente] = useState<"novo" | "lista">("novo");
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
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
      if (window.location.pathname === "/") {
        window.history.replaceState(null, "", "/app");
      }
    }
    setIsVerificandoAuth(false);
  }, []);

  const fetchNotificacoes = async () => {
    const token = localStorage.getItem('authToken');
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

  useEffect(() => {
    if (!autenticado) return;
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60000);
    return () => clearInterval(interval);
  }, [autenticado]);

  const handleMarcarComoLida = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/Notificacoes/${id}/lida`, {
        method: "PATCH",
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const handleNavegacaoNotificacao = (n: Notificacao) => {
    if (!n.lida) handleMarcarComoLida(n.id);
    if (n.agendamentoId) {
      setAgendamentoDestaque(n.agendamentoId);
      if (tipoUsuario === 'Paciente') {
        setAbaAtiva('minhas-consultas');
      } else {
        setAbaAtiva('agendamentos');
      }
      setTimeout(() => setAgendamentoDestaque(null), 5500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("profissionalId");
    localStorage.removeItem("fotoBase64");
    setAutenticado(false);
    window.location.href = "/login"; // Força redirecionamento para o login ao sair
  };

  useScrollBlock(modalPerfilAberto);

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
        const tipo = localStorage.getItem("tipoUsuario");
        const admin = localStorage.getItem("isAdmin") === "true";
        setTipoUsuario(tipo || "Paciente");
        setIsAdmin(admin);
        setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");

        if (window.location.pathname === "/" || window.location.pathname === "/login") {
           window.history.replaceState(null, "", "/app");
        }
      }} />
    );
  }

  // Suprime aviso de CLINIC_NAME não utilizado (mantém import caso seja reaproveitado)
  void CLINIC_NAME;
  void viewPaciente;

  // ── App autenticado ────────────────────────────────────────────────────────
  return (
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
          <ViolacoesList />
        </section>
      )}

      {/* ── Usuários / Pacientes ─────────────────────────────────────────── */}
      {abaAtiva === "pacientes" && (
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
          {tipoUsuario === "Paciente" ? (
            <AgendamentoPaciente onSucesso={() => setAbaAtiva("minhas-consultas")} />
          ) : (
            <AgendamentoList agendamentoDestaque={agendamentoDestaque} />
          )}
        </section>
      )}

      {/* ── Minhas Consultas (Histórico do Paciente) ───────────────────────── */}
      {abaAtiva === "minhas-consultas" && tipoUsuario === "Paciente" && (
        <section aria-label="Minhas consultas">
          <MeusAgendamentos onNovoAgendamento={() => setAbaAtiva("agendamentos")} agendamentoDestaque={agendamentoDestaque} />
        </section>
      )}

      {/* ── Relatórios ────────────────────────────────────────────────────── */}
      {abaAtiva === "relatorios" && tipoUsuario !== "Paciente" && (
        <section aria-label="Relatórios">
          <Relatorios />
        </section>
      )}

      {/* ── Modal de Perfil — bottom-sheet no mobile, centralizado no desktop ── */}
      {modalPerfilAberto && (
        <div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-md p-0 sm:p-4"
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
                {tipoUsuario === "Medico" || tipoUsuario === "Enfermeira"
                  ? <PerfilMedico />
                  : <PerfilPaciente />
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}