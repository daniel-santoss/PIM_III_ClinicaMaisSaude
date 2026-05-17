import { Bell, LayoutDashboard, Users, CalendarDays, ShieldAlert, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import logoPng from '../assets/logo_clinica.png';
import { useScrollBlock } from '../hooks/useScrollBlock';

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
      { id: 'violacoes',    label: 'Violações IA',    icon: <ShieldAlert size={18} /> },
    ];
  }
  if (tipoUsuario === 'Medico' || tipoUsuario === 'Enfermeira') {
    return [
      { id: 'agendamentos', label: 'Agendamentos', icon: <CalendarDays size={18} /> },
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

// ─── Rótulo legível do perfil ─────────────────────────────────────────────────
function getRoleLabel(tipoUsuario: string, isAdmin: boolean): string {
  if (isAdmin) return 'Administrador';
  const map: Record<string, string> = {
    Medico: 'Médico',
    Enfermeira: 'Enfermeira',
    Paciente: 'Paciente',
  };
  return map[tipoUsuario] ?? tipoUsuario;
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
  // isDesktop = tela >= 1280px → sidebar fixa. Abaixo disso: drawer/overlay.
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
  void getRoleLabel(tipoUsuario, isAdmin);

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
      <div style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        marginBottom: 20,
        flexShrink: 0,
        borderBottom: '1px solid #E9E5FF',
        gap: 12
      }}>
        <img
          src={logoPng}
          alt="Logo"
          style={{ width: 32, height: 32, objectFit: 'contain', mixBlendMode: 'multiply' }}
        />
        <span style={{
          fontSize: 15, fontWeight: 800, color: '#7C3AED',
          opacity: (!isDesktop || isHovered) ? 1 : 0,
          transition: 'opacity 0.2s ease',
          whiteSpace: 'nowrap'
        }}>
          Clínica Mais Saúde
        </span>
        {/* Botão fechar drawer (mobile/tablet) */}
        {!isDesktop && (
          <button
            onClick={() => setIsDrawerOpen(false)}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#7C3AED', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {navItems.map(item => {
          const ativo = abaAtiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavegar(item.id); if (!isDesktop) setIsDrawerOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: ativo ? '#7C3AED' : 'transparent',
                color: ativo ? '#FFFFFF' : '#6B7280',
                transition: 'all 0.2s',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={e => {
                if (!ativo) {
                  e.currentTarget.style.background = '#EDE9FE';
                  e.currentTarget.style.color = '#7C3AED';
                }
              }}
              onMouseLeave={e => {
                if (!ativo) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6B7280';
                }
              }}
            >
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <span style={{
                marginLeft: 14, fontSize: 14, fontWeight: ativo ? 700 : 500,
                opacity: (!isDesktop || isHovered) ? 1 : 0,
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: Notificações (desktop), Perfil e Sair */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #E9E5FF', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Sino — apenas sidebar desktop */}
        {isDesktop && (
          <button
            onClick={() => setNotifAberto(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: notifAberto ? '#EDE9FE' : 'transparent',
              color: notifAberto ? '#7C3AED' : '#6B7280',
              transition: 'all 0.2s', width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDE9FE'; e.currentTarget.style.color = '#7C3AED'; }}
            onMouseLeave={e => { if (!notifAberto) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
          >
            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <Bell size={18} />
              {naoLidas > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #fff' }} />
              )}
            </div>
            <span style={{ marginLeft: 14, fontSize: 14, fontWeight: 600, opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
              Notificações {naoLidas > 0 ? `(${naoLidas})` : ''}
            </span>
          </button>
        )}
        <button
          onClick={() => { onAbrirPerfil(); if (!isDesktop) setIsDrawerOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#6B7280', transition: 'all 0.2s', width: '100%', textAlign: 'left'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 13, overflow: 'hidden' }}>
            {fotoBase64
              ? <img src={fotoBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getIniciais(nomeUsuario)
            }
          </div>
          <span style={{
            marginLeft: 14, fontSize: 14, fontWeight: 700, color: '#1F2937',
            opacity: (!isDesktop || isHovered) ? 1 : 0,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
          }}>
            Perfil
          </span>
        </button>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#EF4444', transition: 'all 0.2s', width: '100%', textAlign: 'left'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={20} />
          </div>
          <span style={{
            marginLeft: 14, fontSize: 14, fontWeight: 600,
            opacity: (!isDesktop || isHovered) ? 1 : 0,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
          }}>
            Sair
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>

      {/* ── OVERLAY (Mobile/Tablet) ──────────────────────────────────────────── */}
      {!isDesktop && isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1100,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* ── SIDEBAR DESKTOP (fixa, hover para expandir) ──────────────────────── */}
      {isDesktop && (
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: sidebarWidth,
            height: '100vh',
            background: '#F8F7FF',
            borderRight: '1px solid #E9E5FF',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1200,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '12px 10px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── SIDEBAR DRAWER (Mobile/Tablet) ──────────────────────────────────── */}
      {!isDesktop && (
        <aside
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: 260,
            height: '100vh',
            background: '#F8F7FF',
            borderRight: '1px solid #E9E5FF',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1200,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            padding: '12px 10px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            boxShadow: isDrawerOpen ? '10px 0 30px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── TOPBAR (Mobile/Tablet) ───────────────────────────────────────────── */}
      {!isDesktop && (
        <header style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 60,
          background: '#FFFFFF',
          borderBottom: '1px solid #E9E5FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 1050,
          boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        }}>
          {/* Hamburguer */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#F5F3FF',
              border: '1px solid #E9E5FF',
              color: '#7C3AED',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Menu size={22} />
          </button>

          {/* Logo centralizada — sem nome */}
          <img
            src={logoPng}
            alt="Logo Clínica Mais Saúde"
            style={{ width: 36, height: 36, objectFit: 'contain', mixBlendMode: 'multiply' }}
          />

          {/* Ações direita: Sino + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sino de notificações — mobile/tablet */}
            <button
              onClick={() => setNotifAberto(v => !v)}
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: notifAberto ? '#EDE9FE' : '#F5F3FF',
                border: '1px solid #E9E5FF',
                color: '#7C3AED',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
              }}
            >
              <Bell size={18} />
              {naoLidas > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #fff' }} />
              )}
            </button>

            {/* Avatar (sem nome no mobile) */}
            <button
              onClick={onAbrirPerfil}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#7C3AED',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 13,
                overflow: 'hidden',
              }}
            >
              {fotoBase64
                ? <img src={fotoBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getIniciais(nomeUsuario)
              }
            </button>
          </div>
        </header>
      )}

      {/* ── PAINEL DE NOTIFICAÇÕES UNIFICADO (desktop + mobile) ──────────────── */}
      {notifAberto && (
        <>
          <div onClick={() => setNotifAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />
          <div style={{
            position: 'fixed',
            top: isDesktop ? 16 : 68,
            left: isDesktop ? sidebarWidth + 12 : 8,
            right: isDesktop ? 'auto' : 8,
            width: isDesktop ? 340 : undefined,
            maxWidth: 360,
            marginLeft: isDesktop ? undefined : 'auto',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #E9E5FF',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            zIndex: 2000,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notificações</span>
              {naoLidas > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '2px 8px', borderRadius: 20 }}>{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {notificacoes.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Nenhuma notificação</div>
              ) : notificacoes.map(n => (
                <div key={n.id}
                  style={{ padding: '12px 16px', borderBottom: '1px solid #F9FAFB', background: n.lida ? '#fff' : '#FAFAFE', cursor: 'pointer' }}
                  onClick={() => { onNavegacaoNotificacao(n); setNotifAberto(false); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: n.lida ? 500 : 700, color: '#1F2937', margin: 0 }}>{n.titulo}</p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0', lineHeight: 1.4 }}>{n.mensagem}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onRemoverNotificacao(n.id); }}
                      style={{ color: '#D1D5DB', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                  {!n.lida && (
                    <button onClick={e => { e.stopPropagation(); onMarcarLida(n.id); }}
                      style={{ fontSize: 10, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0, fontWeight: 700 }}>
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
      <main style={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        marginTop: isDesktop ? 0 : 60,
        flex: 1,
        minWidth: 0,
        padding: isDesktop ? '32px 40px' : '24px 16px 48px',
        boxSizing: 'border-box',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        background: '#FFFFFF'
      }}>
        {children}
      </main>

    </div>
  );
}
