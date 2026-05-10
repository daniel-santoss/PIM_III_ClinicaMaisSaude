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

// Aba ativa — inclui "painel" (reservado para uso futuro) sem quebrar nada
type AbaAtiva = "painel" | "pacientes" | "agendamentos" | "violacoes";

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("agendamentos");
  const [viewPaciente, setViewPaciente] = useState<"novo" | "lista">("novo");
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
    }
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
      setAbaAtiva('agendamentos');
      if (tipoUsuario === 'Paciente') setViewPaciente('lista');
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

  // ── Tela de Login ──────────────────────────────────────────────────────────
  if (!autenticado) {
    return (
      <Login onLogado={() => {
        setAutenticado(true);
        const tipo = localStorage.getItem("tipoUsuario");
        const admin = localStorage.getItem("isAdmin") === "true";
        setTipoUsuario(tipo || "Paciente");
        setIsAdmin(admin);
        setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");
      }} />
    );
  }

  // Suprime aviso de CLINIC_NAME não utilizado (mantém import caso seja reaproveitado)
  void CLINIC_NAME;

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

      {/* ── Painel (placeholder para futuro dashboard) ──────────────────── */}
      {abaAtiva === "painel" && (
        <section aria-label="Painel">
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>Painel</h2>
          <p style={{ color: '#9CA3AF' }}>Em breve: visão geral do sistema.</p>
        </section>
      )}

      {/* ── Usuários / Pacientes ─────────────────────────────────────────── */}
      {abaAtiva === "pacientes" && (
        <section aria-label="Gerenciamento de pacientes">
          <div style={{ marginBottom: 32 }}>
            <CadastroUsuario onUserCreated={() => setRecarregarUsuarios((prev) => prev + 1)} />
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
            <>
              {/* Botão de alternância para paciente */}
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => setViewPaciente(viewPaciente === "novo" ? "lista" : "novo")}
                  style={{
                    padding: '8px 18px',
                    background: '#EDE9FE',
                    color: '#7C3AED',
                    border: '1px solid #DDD6FE',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#DDD6FE')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#EDE9FE')}
                >
                  {viewPaciente === "novo" ? "Ver Minhas Consultas" : "Marcar Nova Consulta"}
                </button>
              </div>

              {viewPaciente === "novo"
                ? <AgendamentoPaciente onSucesso={() => setViewPaciente("lista")} />
                : <MeusAgendamentos onNovoAgendamento={() => setViewPaciente("novo")} agendamentoDestaque={agendamentoDestaque} />
              }
            </>
          ) : (
            <AgendamentoList agendamentoDestaque={agendamentoDestaque} />
          )}
        </section>
      )}

      {/* ── Modal de Perfil ───────────────────────────────────────────────── */}
      {modalPerfilAberto && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          role="dialog" aria-modal="true" aria-label="Perfil do usuário"
        >
          <div style={{
            background: '#fff', width: '100%', maxWidth: 560,
            maxHeight: '90vh', borderRadius: 32,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            position: 'relative', display: 'flex', flexDirection: 'column', padding: 8,
          }}>
            <button
              onClick={() => setModalPerfilAberto(false)}
              style={{
                position: 'absolute', right: 24, top: 24,
                padding: 10, background: '#fff', border: 'none',
                borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer', color: '#9CA3AF', zIndex: 160,
                display: 'flex', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
              aria-label="Fechar perfil"
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 16 }} className="custom-scrollbar scroll-smooth">
              <div style={{ padding: '16px 24px 24px' }}>
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