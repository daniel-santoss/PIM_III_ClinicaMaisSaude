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
  link: string | null;
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

const RAIL_W = 72; // sidebar recolhida (só ícones); expande p/ 248px no hover

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

// ─── Cabeçalho (topbar) por aba/perfil ────────────────────────────────────────
function getHeader(abaAtiva: string, tipoUsuario: string, isAdmin: boolean): { titulo: string; subtitulo: string } {
  const isPaciente = tipoUsuario === 'Paciente';
  switch (abaAtiva) {
    case 'pacientes':
      return isAdmin
        ? { titulo: 'Usuários', subtitulo: 'Gestão de perfis e acessos' }
        : { titulo: 'Pacientes', subtitulo: 'Gestão de pacientes' };
    case 'agendamentos':
      return isPaciente
        ? { titulo: 'Agendar consulta', subtitulo: 'Novo atendimento' }
        : { titulo: 'Agendamentos', subtitulo: 'Agenda clínica e triagem' };
    case 'relatorios':
      return { titulo: 'Relatórios', subtitulo: 'Indicadores e exportações' };
    case 'violacoes':
      return { titulo: 'Violações IA', subtitulo: 'Auditoria de segurança' };
    case 'minhas-consultas':
      return { titulo: 'Meus agendamentos', subtitulo: 'Histórico e consultas marcadas' };
    default:
      return { titulo: CLINIC_NAME, subtitulo: 'Portal Clínico' };
  }
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

function papelLabel(tipoUsuario: string, isAdmin: boolean): string {
  if (isAdmin) return 'Administrador';
  switch (tipoUsuario) {
    case 'Medico': return 'Médico';
    case 'Enfermeira': return 'Enfermeira';
    case 'Paciente': return 'Paciente';
    default: return tipoUsuario || 'Usuário';
  }
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
  const header = getHeader(abaAtiva, tipoUsuario, isAdmin);
  const sectionLabel = tipoUsuario === 'Paciente' ? 'Paciente' : 'Administração';

  useScrollBlock(!isDesktop && isDrawerOpen);

  useEffect(() => {
    const handler = (e: Event) => {
      const base64 = (e as CustomEvent<string>).detail;
      setFotoBase64(base64);
    };
    window.addEventListener("fotoPerfilAtualizada", handler);
    return () => window.removeEventListener("fotoPerfilAtualizada", handler);
  }, []);

  const avatar = (
    <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold text-xs overflow-hidden">
      {fotoBase64 ? <img src={fotoBase64} alt="avatar" className="w-full h-full object-cover" /> : getIniciais(nomeUsuario)}
    </div>
  );

  // ─── Sidebar (desktop rail recolhível / drawer mobile) ──────────────────────
  // Quando `colapsavel` (desktop), o rail mostra só ícones; os textos ficam
  // ocultos (opacity 0) e aparecem quando o <aside> expande no hover (group).
  const SidebarContent = ({ isDrawer = false, colapsavel = false }: { isDrawer?: boolean; colapsavel?: boolean }) => {
    const texto = colapsavel ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : '';
    return (
      <>
        {/* Header da sidebar */}
        <div className="flex items-center gap-2.5 px-[18px] h-[65px] shrink-0 border-b border-line">
          <div className="w-[34px] h-[34px] shrink-0 rounded-lg bg-white border border-line grid place-items-center overflow-hidden">
            <img src={logoPng} alt="Logo" className="w-full h-full object-contain p-0.5 mix-blend-multiply" />
          </div>
          <div className={`min-w-0 ${texto}`}>
            <div className="font-bold text-[15px] leading-tight text-ink truncate">{CLINIC_NAME}</div>
            <div className="font-medium text-[11px] text-muted tracking-wide">Portal Clínico</div>
          </div>
          {isDrawer && (
            <button onClick={() => setIsDrawerOpen(false)} className="ml-auto text-body">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-3.5">
          <div className={`font-semibold text-[11px] tracking-wider text-muted uppercase px-3 pt-2 pb-1.5 whitespace-nowrap ${texto}`}>{sectionLabel}</div>
          {navItems.map(item => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => { onNavegar(item.id); if (!isDesktop) setIsDrawerOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left text-sm font-medium transition-colors ${
                  ativo ? 'bg-brand-600 text-white' : 'text-body hover:bg-canvas'
                }`}
              >
                <span className="shrink-0 grid place-items-center">{item.icon}</span>
                <span className={`truncate ${texto}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer: Notificações, Perfil e Sair */}
        <div className="mt-auto border-t border-line p-3 flex flex-col gap-0.5">
          <button
            onClick={() => setNotifAberto(v => !v)}
            title="Notificações"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left text-sm font-medium transition-colors ${
              notifAberto ? 'bg-canvas text-ink' : 'text-body hover:bg-canvas'
            }`}
          >
            <span className="shrink-0 grid place-items-center relative">
              <Bell size={18} />
              {naoLidas > 0 && (
                <span className="absolute -top-1 -right-1 w-[7px] h-[7px] rounded-full bg-danger border-[1.5px] border-white" />
              )}
            </span>
            <span className={`truncate flex-1 ${texto}`}>Notificações</span>
            {naoLidas > 0 && (
              <span className={`text-[11px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded ${texto}`}>{naoLidas}</span>
            )}
          </button>

          <button
            onClick={() => { onAbrirPerfil(); if (!isDesktop) setIsDrawerOpen(false); }}
            title={nomeUsuario}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-canvas transition-colors w-full text-left"
          >
            {avatar}
            <div className={`min-w-0 text-left ${texto}`}>
              <div className="font-semibold text-[13px] leading-tight text-ink truncate">{nomeUsuario}</div>
              <div className="font-medium text-[11px] text-muted">{papelLabel(tipoUsuario, isAdmin)}</div>
            </div>
          </button>
          <button
            onClick={onLogout}
            title="Sair"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left text-sm font-medium text-danger hover:bg-danger-tint transition-colors"
          >
            <LogOut size={17} className="shrink-0" />
            <span className={texto}>Sair</span>
          </button>
        </div>
      </>
    );
  };

  const bellButton = (
    <button
      onClick={() => setNotifAberto(v => !v)}
      className={`w-10 h-10 grid place-items-center rounded-md border border-line text-body relative transition-colors ${
        notifAberto ? 'bg-canvas' : 'bg-white hover:bg-canvas'
      }`}
    >
      <Bell size={18} />
      {naoLidas > 0 && (
        <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-danger border-[1.5px] border-white" />
      )}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-canvas">

      {/* ── OVERLAY (Mobile/Tablet) ── */}
      {!isDesktop && isDrawerOpen && (
        <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-ink/45 z-[1100] backdrop-blur-[2px]" />
      )}

      {/* ── SIDEBAR DESKTOP (rail 72px; expande p/ 248px no hover) ── */}
      {isDesktop && (
        <aside
          className="group fixed top-0 left-0 h-screen bg-white border-r border-line flex flex-col z-[1200] overflow-hidden w-[72px] hover:w-[248px] hover:shadow-modal transition-[width] duration-200 ease-out"
        >
          <SidebarContent colapsavel />
        </aside>
      )}

      {/* ── SIDEBAR DRAWER (Mobile/Tablet) ── */}
      {!isDesktop && (
        <aside
          className={`fixed top-0 left-0 w-[260px] h-screen bg-white border-r border-line flex flex-col z-[1200] transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0 shadow-modal' : '-translate-x-full'
          }`}
        >
          <SidebarContent isDrawer />
        </aside>
      )}

      {/* ── TOPBAR MOBILE ── */}
      {!isDesktop && (
        <header className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-line flex items-center justify-between px-4 z-[1050]">
          <button onClick={() => setIsDrawerOpen(true)} className="w-10 h-10 rounded-md bg-white border border-line text-body grid place-items-center">
            <Menu size={22} />
          </button>
          <img src={logoPng} alt={CLINIC_NAME} className="w-9 h-9 object-contain mix-blend-multiply" />
          <div className="flex items-center gap-2">
            {bellButton}
            <button onClick={onAbrirPerfil} className="shrink-0">{avatar}</button>
          </div>
        </header>
      )}

      {/* ── PAINEL DE NOTIFICAÇÕES ── */}
      {notifAberto && (
        <>
          <div onClick={() => setNotifAberto(false)} className="fixed inset-0 z-[1999]" />
          <div
            className="fixed max-w-[360px] bg-white rounded-xl border border-line shadow-modal z-[2000] overflow-hidden"
            style={{
              bottom: isDesktop ? 16 : 'auto',
              top: isDesktop ? 'auto' : 68,
              left: isDesktop ? RAIL_W + 8 : 8,
              right: isDesktop ? 'auto' : 8,
              width: isDesktop ? 360 : 'auto',
            }}
          >
            <div className="px-4 py-3 border-b border-line flex justify-between items-center">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                  {naoLidas} nova{naoLidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              {notificacoes.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted text-sm">Nenhuma notificação</div>
              ) : notificacoes.map(n => (
                <div key={n.id}
                  className={`px-4 py-3 border-b border-line-soft cursor-pointer transition-colors hover:bg-canvas ${n.lida ? 'bg-white' : 'bg-brand-50/40'}`}
                  onClick={() => { onNavegacaoNotificacao(n); setNotifAberto(false); }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-ink m-0 ${n.lida ? 'font-medium' : 'font-semibold'}`}>{n.titulo}</p>
                      <p className="text-[12px] text-body m-0 mt-0.5 leading-relaxed">{n.mensagem}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onRemoverNotificacao(n.id); }}
                      className="text-muted p-0.5 shrink-0 hover:text-body transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  {!n.lida && (
                    <button onClick={e => { e.stopPropagation(); onMarcarLida(n.id); }}
                      className="text-[11px] text-brand-600 mt-1 font-semibold hover:underline">
                      Marcar como lida
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── COLUNA PRINCIPAL ── */}
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{ marginLeft: isDesktop ? RAIL_W : 0, marginTop: isDesktop ? 0 : 60 }}
      >
        <main className="flex-1 min-w-0 px-7 py-7">
          <div className="max-w-[1180px] mx-auto">
            {/* Título da página (a topbar desktop foi removida; título agora no conteúdo) */}
            {isDesktop && (
              <div className="mb-6">
                <h1 className="font-semibold text-2xl text-ink leading-tight">{header.titulo}</h1>
                <p className="text-[13px] text-muted mt-1">{header.subtitulo}</p>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
