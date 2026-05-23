import { Bell, LayoutDashboard, Users, CalendarDays, ShieldAlert, BarChart2, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import logoPng from '../assets/logo_clinica.png';
import { useScrollBlock } from '../hooks/useScrollBlock';
import { CLINIC_NAME } from '../constants/clinic';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
  lida: boolean;
  dtCriado: string;
};

type AppLayoutProps = {
  tipoUsuario: string;
  isAdmin: boolean;
  abaAtiva: string;
  notificacoes: Notificacao[];
  onNavegar: (aba: string) => void;
  onLogout: () => void;
  onAbrirPerfil: () => void;
  onMarcarLida: (id: string) => void;
  onRemoverNotificacao: (id: string) => void;
  onNavegacaoNotificacao: (n: Notificacao) => void;
  children: React.ReactNode;
};

// ─── Itens de navegação por perfil ────────────────────────────────────────────
function getNavItems(tipoUsuario: string, isAdmin: boolean): NavItem[] {
  if (isAdmin) {
    return [
      { id: 'pacientes',    label: 'Usuários',        icon: <Users size={18} /> },
      { id: 'agendamentos', label: 'Agendamentos',    icon: <CalendarDays size={18} /> },
      { id: 'relatorios',   label: 'Relatórios',      icon: <BarChart2 size={18} /> },
      { id: 'violacoes',    label: 'Violações IA',    icon: <ShieldAlert size={18} /> },
    ];
  }
  if (tipoUsuario === 'Enfermeira') {
    return [
      { id: 'pacientes',    label: 'Pacientes',       icon: <Users size={18} /> },
      { id: 'agendamentos', label: 'Agendamentos',    icon: <CalendarDays size={18} /> },
      { id: 'relatorios',   label: 'Relatórios',      icon: <BarChart2 size={18} /> },
    ];
  }
  if (tipoUsuario === 'Medico') {
    return [
      { id: 'agendamentos', label: 'Agendamentos', icon: <CalendarDays size={18} /> },
      { id: 'relatorios',   label: 'Relatórios',   icon: <BarChart2 size={18} /> },
    ];
  }
  // Paciente
  return [
    { id: 'agendamentos',      label: 'Agendar Consulta',  icon: <CalendarDays size={18} /> },
    { id: 'minhas-consultas', label: 'Minhas Consultas', icon: <LayoutDashboard size={18} /> },
  ];
}

// ─── Iniciais do nome ────────────────────────────────────────────────────────
function getIniciais(nome: string): string {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AppLayout({
  tipoUsuario,
  isAdmin,
  abaAtiva,
  notificacoes,
  onNavegar,
  onLogout,
  onAbrirPerfil,
  onMarcarLida,
  onRemoverNotificacao,
  onNavegacaoNotificacao,
  children,
}: AppLayoutProps) {
  const [notifAberto, setNotifAberto] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(localStorage.getItem("fotoBase64"));
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1280;
      setIsDesktop(desktop);
      if (desktop) setIsDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = getNavItems(tipoUsuario, isAdmin);
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const nomeUsuario = localStorage.getItem('nomeUsuario') ?? localStorage.getItem('tipoUsuario') ?? 'Usuário';

  // Largura da sidebar (só relevante no desktop)
  const sidebarWidth = isDesktop ? (isHovered ? 240 : 72) : 0;

  // Bloqueia scroll quando o drawer mobile/tablet está aberto
  useScrollBlock(!isDesktop && isDrawerOpen);

  useEffect(() => {
    const handler = (e: Event) => {
      const base64 = (e as CustomEvent<string>).detail;
      setFotoBase64(base64);
    };
    window.addEventListener("fotoPerfilAtualizada", handler);
    return () => window.removeEventListener("fotoPerfilAtualizada", handler);
  }, []);

  // ─── Sidebar interna ───────────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      {/* Header da sidebar */}
      <div className="h-[60px] flex items-center px-3 mb-5 shrink-0 border-b border-[#E9E5FF] gap-3">
        <img
          src={logoPng}
          alt="Logo"
          className="w-8 h-8 object-contain mix-blend-multiply"
        />
        <span className={`text-[15px] font-extrabold text-[#7C3AED] transition-opacity duration-200 ease-out whitespace-nowrap ${
          (!isDesktop || isHovered) ? 'opacity-100' : 'opacity-0'
        }`}>
          {CLINIC_NAME}
        </span>
        {/* Botão fechar drawer (mobile/tablet) */}
        {!isDesktop && (
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="ml-auto border-none bg-transparent text-[#7C3AED] cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map(item => {
          const ativo = abaAtiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavegar(item.id); if (!isDesktop) setIsDrawerOpen(false); }}
              className={`flex items-center px-3.5 py-2.5 rounded-xl cursor-pointer w-full text-left transition-all duration-200 ${
                ativo 
                  ? 'bg-[#7C3AED] text-white font-bold' 
                  : 'bg-transparent text-gray-500 hover:bg-[#EDE9FE] hover:text-[#7C3AED]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <span className={`ml-3.5 text-sm transition-opacity duration-200 whitespace-nowrap ${
                ativo ? 'font-bold' : 'font-medium'
              } ${(!isDesktop || isHovered) ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: Notificações (desktop), Perfil e Sair */}
      <div className="mt-auto border-t border-[#E9E5FF] pt-2.5 flex flex-col gap-1">
        {/* Sino — apenas sidebar desktop */}
        {isDesktop && (
          <button
            onClick={() => setNotifAberto(v => !v)}
            className={`flex items-center px-3.5 py-2.5 rounded-xl cursor-pointer w-full text-left transition-all duration-200 ${
              notifAberto 
                ? 'bg-[#EDE9FE] text-[#7C3AED]' 
                : 'bg-transparent text-gray-500 hover:bg-[#EDE9FE] hover:text-[#7C3AED]'
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0 relative">
              <Bell size={18} />
              {naoLidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
              )}
            </div>
            <span className={`ml-3.5 text-sm font-semibold transition-opacity duration-200 whitespace-nowrap ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              Notificações {naoLidas > 0 ? `(${naoLidas})` : ''}
            </span>
          </button>
        )}
        <button
          onClick={() => { onAbrirPerfil(); if (!isDesktop) setIsDrawerOpen(false); }}
          className="flex items-center px-3.5 py-2.5 rounded-xl cursor-pointer bg-transparent text-gray-500 hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-all duration-200 w-full text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 font-extrabold text-sm overflow-hidden">
            {fotoBase64
              ? <img src={fotoBase64} alt="avatar" className="w-full h-full object-cover" />
              : getIniciais(nomeUsuario)
            }
          </div>
          <span className={`ml-3.5 text-sm font-bold text-gray-800 transition-opacity duration-200 whitespace-nowrap ${
            (!isDesktop || isHovered) ? 'opacity-100' : 'opacity-0'
          }`}>
            Perfil
          </span>
        </button>

        <button
          onClick={onLogout}
          className="flex items-center px-3.5 py-2.5 rounded-xl cursor-pointer bg-transparent text-red-500 hover:bg-red-50 transition-all duration-200 w-full text-left"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <LogOut size={20} />
          </div>
          <span className={`ml-3.5 text-sm font-semibold transition-opacity duration-200 whitespace-nowrap ${
            (!isDesktop || isHovered) ? 'opacity-100' : 'opacity-0'
          }`}>
            Sair
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">

      {/* ── OVERLAY (Mobile/Tablet) ──────────────────────────────────────────── */}
      {!isDesktop && isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/45 z-[1100] backdrop-blur-[2px]"
        />
      )}

      {/* ── SIDEBAR DESKTOP (fixa, hover para expandir) ──────────────────────── */}
      {isDesktop && (
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed top-0 left-0 h-screen bg-[#F8F7FF] border-r border-[#E9E5FF] flex flex-col z-[1200] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] p-3 pb-2.5 box-border overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── SIDEBAR DRAWER (Mobile/Tablet) ──────────────────────────────────── */}
      {!isDesktop && (
        <aside
          className={`fixed top-0 left-0 w-[260px] h-screen bg-[#F8F7FF] border-r border-[#E9E5FF] flex flex-col z-[1200] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] p-3 pb-2.5 box-border overflow-hidden ${
            isDrawerOpen ? 'translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.12)]' : '-translate-x-full'
          }`}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── TOPBAR (Mobile/Tablet) ───────────────────────────────────────────── */}
      {!isDesktop && (
        <header className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-[#E9E5FF] flex items-center justify-between px-4 z-[1050] shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
          {/* Hamburguer */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-[#F5F3FF] border border-[#E9E5FF] text-[#7C3AED] flex items-center justify-center cursor-pointer"
          >
            <Menu size={22} />
          </button>

          {/* Logo centralizada — sem nome */}
          <img
            src={logoPng}
            alt={CLINIC_NAME}
            className="w-9 h-9 object-contain mix-blend-multiply"
          />

          {/* Ações direita: Sino + Avatar */}
          <div className="flex items-center gap-2">
            {/* Sino de notificações — mobile/tablet */}
            <button
              onClick={() => setNotifAberto(v => !v)}
              className={`w-10 h-10 rounded-xl border border-[#E9E5FF] text-[#7C3AED] flex items-center justify-center cursor-pointer relative ${
                notifAberto ? 'bg-[#EDE9FE]' : 'bg-[#F5F3FF]'
              }`}
            >
              <Bell size={18} />
              {naoLidas > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
              )}
            </button>

            {/* Avatar (sem nome no mobile) */}
            <button
              onClick={onAbrirPerfil}
              className="w-9 h-9 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center border-none cursor-pointer font-extrabold text-sm overflow-hidden"
            >
              {fotoBase64
                ? <img src={fotoBase64} alt="avatar" className="w-full h-full object-cover" />
                : getIniciais(nomeUsuario)
              }
            </button>
          </div>
        </header>
      )}

      {/* ── PAINEL DE NOTIFICAÇÕES UNIFICADO (desktop + mobile) ──────────────── */}
      {notifAberto && (
        <>
          <div onClick={() => setNotifAberto(false)} className="fixed inset-0 z-[1999]" />
          <div 
            className="fixed max-w-[360px] bg-white rounded-2xl border border-[#E9E5FF] shadow-[0_8px_30px_rgba(0,0,0,0.18)] z-[2000] overflow-hidden"
            style={{
              top: isDesktop ? 16 : 68,
              left: isDesktop ? sidebarWidth + 12 : 8,
              right: isDesktop ? 'auto' : 8,
              width: isDesktop ? 340 : 'auto',
              marginLeft: isDesktop ? undefined : 'auto',
            }}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Notificações</span>
              {naoLidas > 0 && <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full">{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notificacoes.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">Nenhuma notificação</div>
              ) : notificacoes.map(n => (
                <div key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer ${
                    n.lida ? 'bg-white' : 'bg-[#FAFAFE]'
                  }`}
                  onClick={() => { onNavegacaoNotificacao(n); setNotifAberto(false); }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className={`text-sm text-gray-800 m-0 ${n.lida ? 'font-medium' : 'font-bold'}`}>{n.titulo}</p>
                      <p className="text-[11px] text-gray-500 m-0 mt-0.5 leading-relaxed">{n.mensagem}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onRemoverNotificacao(n.id); }}
                      className="text-gray-300 bg-transparent border-none cursor-pointer p-0.5 shrink-0 hover:text-gray-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  {!n.lida && (
                    <button onClick={e => { e.stopPropagation(); onMarcarLida(n.id); }}
                      className="text-[10px] text-[#7C3AED] bg-transparent border-none cursor-pointer mt-1 p-0 font-bold hover:underline">
                      Marcar como lida
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main 
        className="flex-1 min-w-0 min-h-screen bg-white transition-[margin-left] duration-300 ease-out"
        style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
          marginTop: isDesktop ? 0 : 60,
          padding: isDesktop ? '32px 40px' : '24px 16px 48px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

    </div>
  );
}
