import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarX2, ChevronLeft, ChevronRight, Search, UserX, X } from "lucide-react";
import { API_URL } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { chaveData, dataDeChave, nomeEscala } from "../constants/escala";
import { MapNomesTipoConsulta } from "../constants/statusMap";
import { perfis } from "../constants/perfis";
import { useToast } from "../hooks/useToast";
import { useScrollBlock } from "../hooks/useScrollBlock";
import Button from "../components/ui/Button";
import ModalPortal from "../components/ui/ModalPortal";
import Paginacao from "../components/ui/Paginacao";
import ModalRemarcar from "../components/ModalRemarcar";

// ─── Tipos da API (/api/Escala) ───────────────────────────────────────────────
interface DiaResumo { data: string; escala: number; medicos: number; enfermeiras: number; ausencias: number; consultasARemarcar: number }
interface Ausencia { id: string; profissionalId: string; profissional?: string | null; tipoProfissional?: string | null; motivo: string; registradoPor?: string | null }
interface ProfissionalPlantao { id: string; nome: string; tipo: string; consultas: number; ausencia: Ausencia | null }
interface ConsultaARemarcar { id: string; dataHoraConsulta: string; tipoConsulta: string; paciente: string; profissionalId: string; profissional: string; motivo: string }
interface Dia {
  data: string; escala: number; medicos: number; enfermeiras: number;
  ausencias: Ausencia[]; consultasARemarcar: ConsultaARemarcar[];
  profissionais: { itens: ProfissionalPlantao[]; total: number; pagina: number; tamanhoPagina: number };
}
interface ProfissionalResumo { id: string; nome: string; tipo: string }
interface DiaDoProfissional { data: string; plantao: boolean; consultas: number; ausencia: Ausencia | null }
interface MesDoProfissional { id: string; nome: string; tipo: string; escala: number; inicioPlantoes: string; dias: DiaDoProfissional[] }

const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TAMANHO_PAGINA = 8;

const authHeaders = (): HeadersInit => ({ Authorization: `Bearer ${localStorage.getItem(storageKeys.authToken)}` });
const tipoLegivel = (tipo?: string | null) => (tipo === perfis.medico ? "Médico" : "Enfermeira");
const dataLonga = (iso: string) => dataDeChave(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

function SeloEscala({ escala }: { escala: number }) {
  const cor = escala === 1 ? "bg-brand-50 text-brand-600 border-brand-200" : "bg-teal-50 text-teal-700 border-teal-200";
  return <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cor}`}>{nomeEscala(escala)}</span>;
}

// Moldura padrão das janelas desta tela (o detalhe abre ao clicar num dia, em vez de ocupar a tela).
function Janela({ titulo, subtitulo, onFechar, children }: { titulo: React.ReactNode; subtitulo?: string; onFechar: () => void; children: React.ReactNode }) {
  useScrollBlock(true);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onFechar}>
        <div className="bg-white w-full max-w-xl rounded-xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-5 border-b border-line flex items-start justify-between gap-4 shrink-0">
            <div>
              <h3 className="font-semibold text-base text-ink capitalize flex items-center gap-2">{titulo}</h3>
              {subtitulo && <p className="text-[13px] text-muted mt-1">{subtitulo}</p>}
            </div>
            <button type="button" onClick={onFechar} className="text-muted hover:text-body p-1 -mr-1" aria-label="Fechar"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

// Campo de motivo + confirmar, usado para lançar a ausência (em qualquer dia de plantão, inclusive passado).
function FormAusencia({ onConfirmar, onCancelar, salvando }: { onConfirmar: (motivo: string) => void; onCancelar?: () => void; salvando: boolean }) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="space-y-2">
      <input
        autoFocus
        maxLength={200}
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onConfirmar(motivo); if (e.key === "Escape") onCancelar?.(); }}
        placeholder="Motivo (ex.: atestado médico, folga, imprevisto)"
        className="w-full h-9 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted"
      />
      <div className="flex justify-end gap-2">
        {onCancelar && <Button variant="secondary" size="sm" onClick={onCancelar} disabled={salvando}>Cancelar</Button>}
        <Button variant="primary" size="sm" onClick={() => onConfirmar(motivo)} disabled={salvando}>Lançar ausência</Button>
      </div>
    </div>
  );
}

function LinhaAusencia({ ausencia, mostrarNome, onRemover, salvando }: { ausencia: Ausencia; mostrarNome: boolean; onRemover: () => void; salvando: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-warning-border bg-warning-tint/50 px-3 py-2.5">
      <div className="min-w-0 text-sm">
        {mostrarNome && <p className="font-semibold text-ink truncate">{ausencia.profissional} <span className="font-normal text-muted">· {tipoLegivel(ausencia.tipoProfissional)}</span></p>}
        <p className="text-warning-text flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 shrink-0" /> {ausencia.motivo}</p>
        {ausencia.registradoPor && <p className="text-xs text-muted mt-0.5">Lançada por {ausencia.registradoPor}</p>}
      </div>
      <button onClick={onRemover} disabled={salvando} className="text-xs font-semibold text-body hover:text-ink hover:underline shrink-0">Remover</button>
    </div>
  );
}

export default function ControleEscala() {
  const toast = useToast();
  const hoje = new Date();
  const hojeK = chaveData(hoje);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  // Filtro por profissional: sem ninguém escolhido, o calendário mostra a clínica toda.
  const [profissional, setProfissional] = useState<ProfissionalResumo | null>(null);
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<ProfissionalResumo[]>([]);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const [mesGeral, setMesGeral] = useState<DiaResumo[]>([]);
  const [mesProf, setMesProf] = useState<MesDoProfissional | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [remarcando, setRemarcando] = useState<ConsultaARemarcar | null>(null);
  const [versao, setVersao] = useState(0); // força recarga após lançar/remover/remarcar
  const recarregar = () => setVersao(v => v + 1);

  // ── Calendário do mês (geral ou do profissional) ────────────────────────────
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      try {
        const url = profissional
          ? `${API_URL}/api/Escala/profissionais/${profissional.id}?ano=${ano}&mes=${mes}`
          : `${API_URL}/api/Escala/mes?ano=${ano}&mes=${mes}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) { toast.error("Erro ao carregar a escala."); return; }
        const dados = await res.json();
        if (cancelado) return;
        if (profissional) setMesProf(dados); else setMesGeral(dados.dias);
      } catch {
        toast.error("Falha de conexão ao carregar a escala.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes, profissional, versao]);

  // ── Busca do filtro (servidor devolve no máximo 10 nomes) ────────────────────
  useEffect(() => {
    if (!buscaAberta) return;
    let cancelado = false; // descarta a resposta de uma digitação anterior
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/Escala/profissionais?busca=${encodeURIComponent(busca.trim())}`, { headers: authHeaders() });
        if (res.ok && !cancelado) setSugestoes(await res.json());
      } catch { /* a lista só fica vazia */ }
      finally { if (!cancelado) setBuscando(false); }
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [busca, buscaAberta]);

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };
  const irParaHoje = () => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); };

  const totalDias = new Date(ano, mes, 0).getDate();
  const vazios = new Date(ano, mes - 1, 1).getDay();
  const aRemarcarNoMes = profissional ? 0 : mesGeral.reduce((s, d) => s + d.consultasARemarcar, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white border border-line rounded-lg">
        {/* ── Filtro e navegação ─────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            {profissional ? (
              <div className="h-10 pl-3 pr-1.5 flex items-center justify-between gap-2 border border-brand-600 bg-brand-50 rounded-md">
                <span className="text-sm font-semibold text-brand-600 truncate">{profissional.nome} <span className="font-normal">· {tipoLegivel(profissional.tipo)}</span></span>
                <button onClick={() => { setProfissional(null); setBusca(""); }} className="w-7 h-7 grid place-items-center rounded text-brand-600 hover:bg-brand-100" aria-label="Limpar filtro">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onFocus={() => setBuscaAberta(true)}
                  onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
                  placeholder="Filtrar por profissional..."
                  className="w-full h-10 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted"
                />
                {buscaAberta && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-line rounded-lg shadow-modal z-20 py-1 max-h-72 overflow-y-auto">
                    {buscando && sugestoes.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-sm text-muted">Buscando...</p>
                    ) : sugestoes.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-sm text-muted">Nenhum profissional encontrado.</p>
                    ) : sugestoes.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => { setProfissional(s); setBuscaAberta(false); }}
                        className="w-full px-3.5 py-2 text-left text-sm hover:bg-canvas flex items-center justify-between gap-3"
                      >
                        <span className="text-ink truncate">{s.nome}</span>
                        <span className="text-xs text-muted shrink-0">{tipoLegivel(s.tipo)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={irParaHoje}>Hoje</Button>
            <button onClick={() => mudarMes(-1)} className="w-8 h-8 grid place-items-center border border-line rounded-md text-body hover:bg-canvas" aria-label="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
            <span className="w-36 text-center text-sm font-semibold text-ink">{NOMES_MES[mes - 1]} de {ano}</span>
            <button onClick={() => mudarMes(1)} className="w-8 h-8 grid place-items-center border border-line rounded-md text-body hover:bg-canvas" aria-label="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Contexto: profissional escolhido ou alerta do mês ─────────────── */}
        {profissional && mesProf && (
          <div className="px-5 py-3 border-b border-line flex items-center gap-3 flex-wrap text-[13px] text-body">
            <SeloEscala escala={mesProf.escala} />
            <span>Plantões dia sim, dia não desde {dataDeChave(mesProf.inicioPlantoes).toLocaleDateString("pt-BR")}.</span>
            <span className="text-muted">Clique num plantão para lançar ou remover uma ausência.</span>
          </div>
        )}
        {!profissional && aRemarcarNoMes > 0 && (
          <div className="px-5 py-3 border-b border-danger-border bg-danger-tint/50 text-[13px] text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {aRemarcarNoMes} consulta(s) neste mês estão com profissional fora do plantão. Abra os dias marcados para remarcar.
          </div>
        )}

        {/* ── Calendário ─────────────────────────────────────────────────────── */}
        <div className={`p-4 transition-opacity ${carregando ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DIAS_SEMANA.map(d => <div key={d} className="text-center text-[11px] font-semibold text-muted uppercase tracking-wide">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: vazios }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: totalDias }).map((_, i) => {
              const k = chaveData(new Date(ano, mes - 1, i + 1));
              const passado = k < hojeK;
              const numero = (
                <span className={`text-sm font-semibold ${k === hojeK ? "w-6 h-6 grid place-items-center rounded-full bg-brand-600 text-white" : passado ? "text-muted" : "text-ink"}`}>{i + 1}</span>
              );

              if (profissional) {
                const d = mesProf?.dias.find(x => x.data.slice(0, 10) === k);
                const estilo = !d?.plantao ? "border-line bg-white text-muted"
                  : d.ausencia ? "border-warning-border bg-warning-tint"
                  : "border-brand-200 bg-brand-50";
                return (
                  <button key={k} onClick={() => setDiaAberto(k)} className={`h-[68px] p-2 rounded-md border text-left flex flex-col justify-between hover:ring-2 hover:ring-brand-600/20 ${estilo}`}>
                    {numero}
                    {d?.plantao && (
                      <span className={`text-[11px] font-semibold ${d.ausencia ? "text-warning-text" : "text-brand-600"}`}>
                        {d.ausencia ? "Ausente" : "Plantão"}{d.consultas > 0 && <span className="font-normal"> · {d.consultas} cons.</span>}
                      </span>
                    )}
                  </button>
                );
              }

              const d = mesGeral.find(x => x.data.slice(0, 10) === k);
              const desfalque = !!d && !passado && (d.medicos === 0 || d.enfermeiras === 0);
              return (
                <button key={k} onClick={() => setDiaAberto(k)} className={`h-[68px] p-2 rounded-md border text-left flex flex-col justify-between hover:ring-2 hover:ring-brand-600/20 ${desfalque ? "border-warning-border" : "border-line"} ${passado ? "bg-canvas/60" : "bg-white"}`}>
                  <div className="flex items-start justify-between">
                    {numero}
                    {d && <span className={`text-[10px] font-semibold ${d.escala === 1 ? "text-brand-600" : "text-teal-700"}`}>E{d.escala}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {desfalque && <span className="text-[10px] font-semibold text-warning-text">{d!.medicos === 0 ? "Sem médico" : "Sem enfermeira"}</span>}
                    {!!d?.ausencias && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning-text" title="Ausências"><UserX className="w-3 h-3" />{d.ausencias}</span>}
                    {!!d?.consultasARemarcar && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-danger" title="Consultas a remarcar"><CalendarX2 className="w-3 h-3" />{d.consultasARemarcar}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-body">
            {profissional ? (
              <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-50 border border-brand-200" /> plantão</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warning-tint border border-warning-border" /> ausente</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-line" /> folga</span>
              </>
            ) : (
              <>
                <span>E1/E2: escala do dia</span>
                <span className="flex items-center gap-1"><UserX className="w-3.5 h-3.5 text-warning-text" /> ausências</span>
                <span className="flex items-center gap-1"><CalendarX2 className="w-3.5 h-3.5 text-danger" /> consultas a remarcar</span>
                <span className="text-muted">Clique num dia para ver o plantão.</span>
              </>
            )}
          </div>
        </div>
      </div>

      {diaAberto && !profissional && (
        <JanelaDia data={diaAberto} onFechar={() => setDiaAberto(null)} onRemarcar={setRemarcando} onAlterou={recarregar} versao={versao} />
      )}
      {diaAberto && profissional && mesProf && (
        <JanelaDiaDoProfissional
          profissional={mesProf}
          dia={mesProf.dias.find(x => x.data.slice(0, 10) === diaAberto)!}
          onFechar={() => setDiaAberto(null)}
          onAlterou={recarregar}
        />
      )}
      {remarcando && (
        <ModalRemarcar
          agenda={{
            id: remarcando.id,
            pacienteNome: remarcando.paciente,
            tipoConsulta: remarcando.tipoConsulta,
            dataHoraConsulta: remarcando.dataHoraConsulta,
            profissionalId: remarcando.profissionalId,
          }}
          onFechar={() => setRemarcando(null)}
          onSucesso={() => { setRemarcando(null); toast.success("Consulta remarcada."); recarregar(); }}
        />
      )}
    </div>
  );
}

// ─── Ações de ausência compartilhadas pelas duas janelas ──────────────────────
function useAusencias(onAlterou: () => void) {
  const toast = useToast();
  const [salvando, setSalvando] = useState(false);

  const lancar = async (profissionalId: string, data: string, motivo: string) => {
    if (!motivo.trim()) { toast.warning("Informe o motivo da ausência."); return false; }
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/ausencias`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ profissionalId, data, motivo: motivo.trim() }),
      });
      if (!res.ok) { toast.error(await res.text()); return false; }
      const { consultasARemarcar } = await res.json();
      toast.success(consultasARemarcar > 0
        ? `Ausência lançada. ${consultasARemarcar} consulta(s) precisam ser remarcadas.`
        : "Ausência lançada.");
      onAlterou();
      return true;
    } catch {
      toast.error("Falha de conexão ao lançar a ausência.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (ausenciaId: string) => {
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/ausencias/${ausenciaId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success("Ausência removida.");
      onAlterou();
    } catch {
      toast.error("Falha de conexão ao remover a ausência.");
    } finally {
      setSalvando(false);
    }
  };

  return { lancar, remover, salvando };
}

// ─── Janela do dia (visão geral) ──────────────────────────────────────────────
function JanelaDia({ data, versao, onFechar, onRemarcar, onAlterou }: {
  data: string; versao: number; onFechar: () => void; onRemarcar: (c: ConsultaARemarcar) => void; onAlterou: () => void;
}) {
  const toast = useToast();
  const [dia, setDia] = useState<Dia | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [lancandoPara, setLancandoPara] = useState<string | null>(null);
  const { lancar, remover, salvando } = useAusencias(onAlterou);

  const carregar = useCallback(async () => {
    try {
      const q = new URLSearchParams({ data, pagina: String(pagina), tamanhoPagina: String(TAMANHO_PAGINA) });
      if (busca.trim()) q.set("busca", busca.trim());
      const res = await fetch(`${API_URL}/api/Escala/dia?${q}`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar o plantão do dia."); return; }
      setDia(await res.json());
    } catch {
      toast.error("Falha de conexão ao carregar o plantão.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pagina, busca]);

  useEffect(() => { const t = setTimeout(carregar, busca ? 250 : 0); return () => clearTimeout(t); }, [carregar, versao, busca]);
  useEffect(() => { setPagina(1); }, [busca]);

  const totalPaginas = dia ? Math.ceil(dia.profissionais.total / dia.profissionais.tamanhoPagina) : 1;

  return (
    <Janela
      titulo={<>{dataLonga(data)} {dia && <SeloEscala escala={dia.escala} />}</>}
      subtitulo={dia ? `${dia.medicos} médico(s) e ${dia.enfermeiras} enfermeira(s) de plantão · 07:00 às 19:00` : "Carregando..."}
      onFechar={onFechar}
    >
      {dia && (
        <div className="divide-y divide-line">
          {dia.ausencias.length > 0 && (
            <section className="px-6 py-4 space-y-2">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">Ausências ({dia.ausencias.length})</h4>
              {dia.ausencias.map(a => <LinhaAusencia key={a.id} ausencia={a} mostrarNome onRemover={() => remover(a.id)} salvando={salvando} />)}
            </section>
          )}

          {dia.consultasARemarcar.length > 0 && (
            <section className="px-6 py-4 space-y-2">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">Consultas a remarcar ({dia.consultasARemarcar.length})</h4>
              {dia.consultasARemarcar.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-md border border-danger-border bg-danger-tint/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-ink truncate">{c.dataHoraConsulta.slice(11, 16)} · {c.paciente}</p>
                    <p className="text-xs text-body truncate">
                      {MapNomesTipoConsulta[c.tipoConsulta] ?? c.tipoConsulta} com {c.profissional} · {c.motivo === "Ausência" ? "profissional ausente" : "fora da escala do dia"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRemarcar(c)}>Remarcar</Button>
                </div>
              ))}
            </section>
          )}

          <section className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">Profissionais da escala ({dia.profissionais.total})</h4>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full h-8 pl-8 pr-3 text-[13px] text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 placeholder:text-muted"
                />
              </div>
            </div>

            {dia.profissionais.itens.length === 0 ? (
              <p className="text-sm text-body">Nenhum profissional encontrado.</p>
            ) : (
              <ul className="divide-y divide-line border border-line rounded-md">
                {dia.profissionais.itens.map(p => (
                  <li key={p.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${p.ausencia ? "text-muted line-through" : "text-ink"}`}>{p.nome}</p>
                        <p className="text-xs text-muted">{tipoLegivel(p.tipo)} · {p.consultas} consulta(s)</p>
                      </div>
                      {p.ausencia ? (
                        <span className="text-xs font-semibold text-warning-text">Ausente</span>
                      ) : lancandoPara !== p.id && (
                        <Button variant="ghost" size="sm" onClick={() => setLancandoPara(p.id)}>Lançar ausência</Button>
                      )}
                    </div>
                    {lancandoPara === p.id && (
                      <div className="mt-2.5">
                        <FormAusencia
                          salvando={salvando}
                          onCancelar={() => setLancandoPara(null)}
                          onConfirmar={async motivo => { if (await lancar(p.id, data, motivo)) setLancandoPara(null); }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
            </div>
          </section>
        </div>
      )}
    </Janela>
  );
}

// ─── Janela de um dia do profissional filtrado ───────────────────────────────
function JanelaDiaDoProfissional({ profissional, dia, onFechar, onAlterou }: {
  profissional: MesDoProfissional; dia: DiaDoProfissional; onFechar: () => void; onAlterou: () => void;
}) {
  const { lancar, remover, salvando } = useAusencias(onAlterou);
  const data = dia.data.slice(0, 10);

  return (
    <Janela titulo={dataLonga(data)} subtitulo={`${profissional.nome} · ${tipoLegivel(profissional.tipo)}`} onFechar={onFechar}>
      <div className="px-6 py-5 space-y-3">
        {!dia.plantao ? (
          <p className="text-sm text-body">Folga da escala: não há plantão neste dia.</p>
        ) : (
          <>
            <p className="text-sm text-body">Plantão das 07:00 às 19:00 · {dia.consultas} consulta(s) agendada(s).</p>
            {dia.ausencia ? (
              <LinhaAusencia ausencia={dia.ausencia} mostrarNome={false} onRemover={async () => { await remover(dia.ausencia!.id); onFechar(); }} salvando={salvando} />
            ) : (
              <FormAusencia salvando={salvando} onConfirmar={async motivo => { if (await lancar(profissional.id, data, motivo)) onFechar(); }} />
            )}
          </>
        )}
      </div>
    </Janela>
  );
}
