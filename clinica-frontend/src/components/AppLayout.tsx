import { Bell, LayoutDashboard, Users, CalendarDays, ShieldAlert, Settings, LogOut, User, CheckCheck, Trash2, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import logoPng from '../assets/logo_clinica.png';

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
    { id: 'agendamentos', label: 'Meus Agendamentos', icon: <CalendarDays size={18} /> },
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
  const [menuAberto, setMenuAberto] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = getNavItems(tipoUsuario, isAdmin);
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const nomeUsuario = localStorage.getItem('nomeUsuario') ?? localStorage.getItem('tipoUsuario') ?? 'Usuário';
  const roleLabel = getRoleLabel(tipoUsuario, isAdmin);

  const sidebarWidth = isMobile ? (isDrawerOpen ? 260 : 0) : (isHovered ? 240 : 72);
  const mainMargin = isMobile ? 0 : sidebarWidth;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>

      {isMobile && isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, backdropFilter: 'blur(2px)' }} 
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside 
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: sidebarWidth,
          height: '100vh',
          background: '#F8F7FF',
          borderRight: '1px solid #E9E5FF',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1200,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: isMobile && !isDrawerOpen ? 0 : '12px 10px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          boxShadow: isMobile && isDrawerOpen ? '10px 0 30px rgba(0,0,0,0.1)' : 'none'
        }}
      >
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
          <span style={{ fontSize: 15, fontWeight: 800, color: '#7C3AED', opacity: (isHovered || isMobile) ? 1 : 0, transition: 'opacity 0.2s ease', whiteSpace: 'nowrap' }}>
            Clínica Mais Saúde
          </span>
          {isMobile && (
            <button onClick={() => setIsDrawerOpen(false)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#7C3AED', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map(item => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavegar(item.id); if(isMobile) setIsDrawerOpen(false); }}
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
                <span style={{ marginLeft: 14, fontSize: 14, fontWeight: ativo ? 700 : 500, opacity: (isHovered || isMobile) ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User Profile & Actions (Bottom) */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #E9E5FF', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          <button
            onClick={() => onAbrirPerfil()}
            style={{
              display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#6B7280', transition: 'all 0.2s', width: '100%', textAlign: 'left'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 13 }}>
              {getIniciais(nomeUsuario)}
            </div>
            <span style={{ marginLeft: 14, fontSize: 14, fontWeight: 700, color: '#1F2937', opacity: (isHovered || isMobile) ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
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
            <span style={{ marginLeft: 14, fontSize: 14, fontWeight: 600, opacity: (isHovered || isMobile) ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOGGLE BUTTON ────────────────────────────────────────────── */}
      {isMobile && !isDrawerOpen && (
        <button 
          onClick={() => setIsDrawerOpen(true)}
          style={{
            position: 'fixed', top: 16, left: 16, width: 44, height: 44, borderRadius: 12,
            background: '#FFFFFF', border: '1px solid #E9E5FF', color: '#7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer'
          }}
        >
          <Menu size={24} />
        </button>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main style={{
        marginLeft: mainMargin,
        marginTop: 0,
        flex: 1,
        padding: isMobile ? '76px 20px 32px' : '32px 40px',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        minHeight: '100vh',
        background: '#FFFFFF'
      }}>
        {children}
      </main>

    </div>
  );
}
