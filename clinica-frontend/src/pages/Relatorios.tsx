import { useState, useEffect } from 'react';
import { API_URL } from '../constants/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { Download, FileSpreadsheet, X, Calendar, RefreshCw } from 'lucide-react';
import { ESPECIALIDADES } from '../constants/especialidades';
import CheckboxDropdown from '../components/CheckboxDropdown';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type AgendamentoPorDia = { data: string; total: number };
type EspecialidadeRanking = { nome: string; total: number };
type PacientesNovosVsRecorrentes = { mes: string; novos: number; recorrentes: number };
type ProfissionalCarga = { id: string; nome: string; total: number };
type FluxoExames = { total: number; liberados: number; pendentes: number };
type AuditoriaIA = { totalInjecoes: number; totalUsoIndevido: number; bloqueados: number };

type DashboardDto = {
  totalAgendamentos: number;
  agendamentosPorStatus: Record<string, number>;
  agendamentosPorDia: AgendamentoPorDia[];
  especialidadesMaisProcuradas: EspecialidadeRanking[];
  taxaAbsenteismo: number;
  pacientesNovosVsRecorrentes: PacientesNovosVsRecorrentes[];
  agendamentosPorProfissional: ProfissionalCarga[] | null;
  fluxoExames: FluxoExames;
  auditoriaIA: AuditoriaIA | null;
};

type UltimoAgendamento = { data: string; paciente: string; status: string; };
type DetalhesProfissional = {
  distribuicaoPorStatus: Record<string, number>;
  ultimosAgendamentos: UltimoAgendamento[];
};



// ─── Cores por status (padrão do sistema) ─────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Agendado: '#3B82F6',
  EmAtendimento: '#F59E0B',
  AguardandoRetorno: '#F97316',
  RetornoAgendado: '#2C5282',
  Finalizado: '#10B981',
  Cancelado: '#6B7280',
  Faltou: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  Agendado: 'Agendado',
  EmAtendimento: 'Em Atendimento',
  AguardandoRetorno: 'Aguard. Retorno',
  RetornoAgendado: 'Retorno Agendado',
  Finalizado: 'Finalizado',
  Cancelado: 'Cancelado',
  Faltou: 'Faltou',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function subDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Componentes Customizados ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-purple-200 rounded-lg px-4 py-3 shadow-md">
        <p className="m-0 font-bold text-gray-800 mb-2">
          {label && label.includes('-') ? formatDisplayDate(label) : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="m-0 text-[13px] font-semibold" style={{ color: entry.color || '#6B7280' }}>
            {entry.name}: {entry.value} {entry.name === 'Taxa' ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function Relatorios() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const token = localStorage.getItem('authToken') || '';

  const [periodoLabel, setPeriodoLabel] = useState('30');
  const [dataInicio, setDataInicio] = useState(formatDate(subDays(30)));
  const [dataFim, setDataFim] = useState(formatDate(new Date()));
  const [dados, setDados] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Interatividade States ────────────────────────────────────────────────
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroEspecialidades, setFiltroEspecialidades] = useState<string[]>([]);
  const [esconderNovos, setEsconderNovos] = useState(false);
  const temFiltrosAtivos = filtroStatus.length > 0 || filtroEspecialidades.length > 0;
  const [esconderRecorrentes, setEsconderRecorrentes] = useState(false);

  // Drawer Profissional
  const [profissionalDrawer, setProfissionalDrawer] = useState<ProfissionalCarga | null>(null);
  const [detalhesProf, setDetalhesProf] = useState<DetalhesProfissional | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);



  const selecionarPeriodo = (dias: string) => {
    setPeriodoLabel(dias);
    if (dias !== 'custom') {
      const d = parseInt(dias);
      setDataInicio(formatDate(subDays(d)));
      setDataFim(formatDate(new Date()));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `${API_URL}/api/Dashboard/estatisticas?dataInicio=${dataInicio}&dataFim=${dataFim}`;
        filtroStatus.forEach(s => url += `&status=${encodeURIComponent(s)}`);
        filtroEspecialidades.forEach(e => url += `&especialidades=${encodeURIComponent(e)}`);

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDados(await res.json());
      } catch (e) {
        console.error('Erro ao buscar estatísticas', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dataInicio, dataFim, filtroStatus, filtroEspecialidades]);

  useEffect(() => {
    if (profissionalDrawer) {
      document.body.style.overflow = 'hidden';
      const fetchDetalhes = async () => {
        setLoadingDetalhes(true);
        try {
          const res = await fetch(`${API_URL}/api/Dashboard/profissional/${profissionalDrawer.id}/detalhes?dataInicio=${dataInicio}&dataFim=${dataFim}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) setDetalhesProf(await res.json());
        } catch (e) { console.error(e); }
        setLoadingDetalhes(false);
      }
      fetchDetalhes();
    } else {
      document.body.style.overflow = 'auto';
      setDetalhesProf(null);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [profissionalDrawer, dataInicio, dataFim, token]);



  const exportar = async (tipo: 'excel' | 'pdf') => {
    const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
    let url = `${API_URL}/api/Dashboard/exportar/${tipo}?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    filtroStatus.forEach(s => url += `&status=${encodeURIComponent(s)}`);
    filtroEspecialidades.forEach(e => url += `&especialidades=${encodeURIComponent(e)}`);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `relatorio_${dataInicio}_${dataFim}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Erro ao exportar', e);
    }
  };

  const limparFiltros = () => {
    setFiltroStatus([]);
    setFiltroEspecialidades([]);
  };

  const toggleFiltroStatus = (key: string) => {
    setFiltroStatus(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const toggleFiltroEspecialidade = (nome: string) => {
    setFiltroEspecialidades(prev => prev.includes(nome) ? prev.filter(e => e !== nome) : [...prev, nome]);
  };

  // ─── Dados derivados para gráficos ────────────────────────────────────────
  const pieData = dados
    ? Object.entries(dados.agendamentosPorStatus).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      key: name,
      value,
      color: STATUS_COLORS[name] || '#9CA3AF',
    }))
    : [];

  const examesBarData = dados
    ? [
      { nome: 'Liberados', valor: dados.fluxoExames.liberados },
      { nome: 'Pendentes', valor: dados.fluxoExames.pendentes },
    ]
    : [];

  const card = 'bg-white rounded-lg border border-line p-6';

  const btnPeriodoClass = (val: string) =>
    `h-9 px-3.5 rounded-md text-[13px] cursor-pointer transition-colors border ${periodoLabel === val
      ? 'border-brand-600 bg-brand-600 text-white font-semibold'
      : 'border-line bg-white text-body font-medium hover:bg-canvas'
    }`;

  const kpiCard = (label: string, value: string | number, accent: string): React.ReactNode => (
    <div className="bg-white border border-line rounded-lg px-4 py-[11px] min-w-0">
      <div className="font-semibold text-[11px] tracking-wide text-muted uppercase">{label}</div>
      <div className="font-bold text-[24px] leading-tight mt-0.5" style={{ color: accent }}>{value}</div>
    </div>
  );

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-4 mt-2">
        {payload.map((entry: any, index: number) => {
          const isHidden = entry.value === 'Novos' ? esconderNovos : esconderRecorrentes;
          return (
            <div key={`item-${index}`}
              onClick={() => {
                if (entry.value === 'Novos') setEsconderNovos(!esconderNovos);
                if (entry.value === 'Recorrentes') setEsconderRecorrentes(!esconderRecorrentes);
              }}
              className={`flex items-center gap-1.5 cursor-pointer ${isHidden ? 'opacity-50 line-through' : ''}`}>
              <div className="w-3 h-3 rounded-sm" style={{ background: entry.color }} />
              <span className="text-[13px] font-semibold text-gray-700">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* ── Export ── */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 mb-6">
        <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-white text-body border border-line font-semibold text-[13px] cursor-pointer transition-colors hover:bg-canvas" onClick={() => exportar('pdf')}>
          <Download size={15} /> Exportar PDF
        </button>
        <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-brand-600 text-white border border-brand-600 font-semibold text-[13px] cursor-pointer transition-colors hover:bg-brand-800" onClick={() => exportar('excel')}>
          <FileSpreadsheet size={15} /> Exportar Excel
        </button>
      </div>

      {temFiltrosAtivos && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filtroStatus.map(s => (
            <div key={s} className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
              <span className="text-xs font-semibold text-gray-600">Status: <span className="text-[#2C5282]">{STATUS_LABELS[s] || s}</span></span>
              <button onClick={() => toggleFiltroStatus(s)} className="bg-transparent border-none cursor-pointer flex p-0.5"><X size={12} className="text-gray-500" /></button>
            </div>
          ))}
          {filtroEspecialidades.map(e => (
            <div key={e} className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
              <span className="text-xs font-semibold text-gray-600">Espec: <span className="text-[#2C5282]">{e}</span></span>
              <button onClick={() => toggleFiltroEspecialidade(e)} className="bg-transparent border-none cursor-pointer flex p-0.5"><X size={12} className="text-gray-500" /></button>
            </div>
          ))}
          <button onClick={limparFiltros} className="inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-xs font-bold text-red-500">
            <RefreshCw size={12} /> Limpar filtros
          </button>
        </div>
      )}

      {/* ── Período + Filtros ── */}
      <div className={`${card} mb-6 !p-4`}>
        <div className="flex flex-wrap gap-2 items-center">
          <button className={btnPeriodoClass('7')} onClick={() => selecionarPeriodo('7')}>Últimos 7 dias</button>
          <button className={btnPeriodoClass('30')} onClick={() => selecionarPeriodo('30')}>Últimos 30 dias</button>
          <button className={btnPeriodoClass('90')} onClick={() => selecionarPeriodo('90')}>Últimos 90 dias</button>
          <button className={btnPeriodoClass('custom')} onClick={() => selecionarPeriodo('custom')}>Personalizado</button>
          {periodoLabel === 'custom' && (
            <>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-700" />
              <span className="text-gray-400 text-[13px]">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-700" />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Filtros:</span>
          <CheckboxDropdown
            label="Status"
            options={['Agendado', 'Confirmado', 'Finalizado', 'Cancelado', 'Faltou', 'EmEspera', 'EmAtendimento']}
            selected={filtroStatus}
            onChange={setFiltroStatus}
            displayMap={STATUS_LABELS}
          />
          <CheckboxDropdown
            label="Especialidade"
            options={[...ESPECIALIDADES]}
            selected={filtroEspecialidades}
            onChange={setFiltroEspecialidades}
          />
          {temFiltrosAtivos && (
            <button onClick={limparFiltros} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-300 bg-red-50 text-xs font-bold text-red-500 cursor-pointer">
              <RefreshCw size={13} /> Limpar
            </button>
          )}
        </div>
      </div>

      {loading && !dados ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-9 h-9 border-4 border-[#2C5282] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !dados ? (
        <div className="text-center text-gray-400 py-10">Nenhum dado para o período selecionado.</div>
      ) : (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
            {kpiCard('Total Agendamentos', dados.totalAgendamentos, '#0F172A')}
            {kpiCard('Taxa Absenteísmo', `${dados.taxaAbsenteismo}%`, '#DC2626')}
            {kpiCard('Exames Total', dados.fluxoExames.total, '#0F172A')}
            {kpiCard('Exames Liberados', dados.fluxoExames.liberados, '#059669')}
          </div>

          {/* ── 1. Volume de Atendimentos (full width) ────────────────────────── */}
          <div className={`${card} mb-6`}>
            <h3 className="text-[15px] font-semibold text-ink mb-4">Volume de Atendimentos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dados.agendamentosPorDia.map(d => ({ ...d, data: d.data }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={formatDisplayDate} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" name="Agendamentos" stroke="#2C5282" strokeWidth={2.5} dot={{ fill: '#2C5282', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Grid 2 colunas ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

            {/* 2. Distribuição por Status */}
            <div className={card}>
              <h3 className="text-[15px] font-semibold text-ink mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} style={{ fontSize: 11, cursor: 'pointer' }}
                    onClick={(data: any) => toggleFiltroStatus(data.key as string)}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color}
                        style={{ opacity: filtroStatus.length > 0 && !filtroStatus.includes(entry.key) ? 0.4 : 1, transition: 'opacity 0.2s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Especialidades mais procuradas */}
            <div className={card}>
              <h3 className="text-[15px] font-semibold text-ink mb-4">Especialidades Mais Procuradas</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dados.especialidadesMaisProcuradas} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#6B7280' }} width={75} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" radius={[0, 6, 6, 0]} barSize={18} style={{ cursor: 'pointer' }}
                    onClick={(data: any) => toggleFiltroEspecialidade(data.nome as string)}
                  >
                    {dados.especialidadesMaisProcuradas.map((entry, i) => (
                      <Cell key={i} fill={filtroEspecialidades.includes(entry.nome) ? '#2C5282' : '#9CA3AF'}
                        style={{ opacity: filtroEspecialidades.length > 0 && !filtroEspecialidades.includes(entry.nome) ? 0.4 : 1, transition: 'all 0.2s' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. Taxa de Absenteísmo por mês */}
            <div className={card}>
              <h3 className="text-[15px] font-semibold text-ink mb-4">Absenteísmo por Mês</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dados.pacientesNovosVsRecorrentes.map(m => {
                  const totalMes = m.novos + m.recorrentes;
                  return { Mes: m.mes, Taxa: totalMes > 0 ? Math.round(Number(dados.taxaAbsenteismo)) : 0 };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="Mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Taxa" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 5. Pacientes Novos vs Recorrentes */}
            <div className={card}>
              <h3 className="text-[15px] font-semibold text-ink mb-4">Pacientes Novos vs Recorrentes</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dados.pacientesNovosVsRecorrentes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="novos" name="Novos" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={20} hide={esconderNovos} />
                  <Bar dataKey="recorrentes" name="Recorrentes" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} hide={esconderRecorrentes} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 7. Fluxo de Exames */}
            <div className={card}>
              <h3 className="text-[15px] font-semibold text-ink mb-4">Fluxo de Exames</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={examesBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={40}>
                    {examesBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.nome === 'Liberados' ? '#10B981' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 9. Carga por Profissional (Admin only) */}
            {isAdmin && dados.agendamentosPorProfissional && (
              <div className={card}>
                <h3 className="text-[15px] font-semibold text-ink mb-4">Carga por Profissional</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dados.agendamentosPorProfissional} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#6B7280' }} width={75} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Agendamentos" fill="#152D5C" radius={[0, 6, 6, 0]} barSize={18} style={{ cursor: 'pointer' }}
                      onClick={(data) => setProfissionalDrawer(data.payload)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>


          {/* ── 8. Auditoria IA (Admin only) — cards numéricos ────────────── */}
          {isAdmin && dados.auditoriaIA && (
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-ink mb-4">Auditoria IA</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                {kpiCard('Injeções Detectadas', dados.auditoriaIA.totalInjecoes, '#EF4444')}
                {kpiCard('Uso Indevido', dados.auditoriaIA.totalUsoIndevido, '#F59E0B')}
                {kpiCard('Pacientes Bloqueados', dados.auditoriaIA.bloqueados, '#6B7280')}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Drawer: Carga por Profissional ─────────────────────────────────── */}
      {profissionalDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[100]" onClick={() => setProfissionalDrawer(null)} />
          <div className="fixed top-0 right-0 bottom-0 w-[400px] max-w-full bg-white z-[101] p-6 shadow-xl overflow-y-auto">
            <button onClick={() => setProfissionalDrawer(null)} className="absolute top-4 right-4 bg-transparent border-none cursor-pointer">
              <X size={20} className="text-gray-500" />
            </button>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2 mt-3">{profissionalDrawer.nome}</h2>
            <p className="text-gray-500 text-sm mb-6">Total de agendamentos no período: <strong className="text-[#2C5282]">{profissionalDrawer.total}</strong></p>

            {loadingDetalhes ? (
              <div className="text-center py-10"><div className="w-6 h-6 border-[3px] border-[#2C5282] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : detalhesProf ? (
              <>
                <h3 className="text-[15px] font-semibold text-ink mb-4">Distribuição por Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={Object.entries(detalhesProf.distribuicaoPorStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#9CA3AF' }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {Object.entries(detalhesProf.distribuicaoPorStatus).map(([k, _], i) => <Cell key={i} fill={STATUS_COLORS[k] || '#9CA3AF'} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <h3 className="text-[15px] font-bold text-gray-800 mt-6 mb-4">Últimos 5 Agendamentos</h3>
                {detalhesProf.ultimosAgendamentos.length === 0 ? <p className="text-[13px] text-gray-400">Nenhum agendamento.</p> : (
                  <div className="flex flex-col gap-3">
                    {detalhesProf.ultimosAgendamentos.map((ag, i) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{ag.paciente}</span>
                          <span className="text-xs font-bold" style={{ color: STATUS_COLORS[ag.status] || '#6B7280' }}>{STATUS_LABELS[ag.status] || ag.status}</span>
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} /> {ag.data.includes('-') ? formatDisplayDate(ag.data) : ag.data}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </>
      )}


    </div>
  );
}
