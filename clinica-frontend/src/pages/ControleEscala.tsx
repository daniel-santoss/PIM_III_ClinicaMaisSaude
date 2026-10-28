import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarX2, ChevronLeft, ChevronRight, HeartPulse, RefreshCw, Stethoscope, UserX } from "lucide-react";
import { API_URL } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { escalaDoDia, nomeEscala, quandoTrabalha } from "../constants/escala";
import { ESPECIALIDADES } from "../constants/especialidades";
import { MapNomesTipoConsulta } from "../constants/statusMap";
import { perfis } from "../constants/perfis";
import { useToast } from "../hooks/useToast";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import ModalRemarcar from "../components/ModalRemarcar";

// ─── Tipos da API (/api/Escala) ───────────────────────────────────────────────
interface DiaResumo {
  data: string;
  escala: number;
  medicos: number;
  enfermeiras: number;
  ausencias: number;
  consultasARemarcar: number;
}
interface Composicao { escala: number; medicos: number; enfermeiras: number }
interface Mes { ano: number; mes: number; dias: DiaResumo[]; composicao: Composicao[] }
interface Ausencia { id: string; motivo: string; registradoPor?: string | null }
interface ProfissionalPlantao {
  id: string;
  nome: string;
  tipo: string;
  especialidades: number[];
  consultas: number;
  ausencia: Ausencia | null;
}
interface ConsultaARemarcar {
  id: string;
  dataHoraConsulta: string;
  tipoConsulta: string;
  paciente: string;
  profissionalId: string;
  profissional: string;
  motivo: string;
}
interface Dia { data: string; escala: number; profissionais: ProfissionalPlantao[]; consultasARemarcar: ConsultaARemarcar[] }

const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Cada escala com sua cor: a 1 na cor da marca, a 2 em verde-água, para o calendário ler de longe.
const COR_ESCALA: Record<number, string> = {
  1: "bg-brand-50 text-brand-600 border-brand-200",
  2: "bg-teal-50 text-teal-700 border-teal-200",
};

const chave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dataLocal = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
};
const hojeChave = () => chave(new Date());
const authHeaders = (): HeadersInit => ({ Authorization: `Bearer ${localStorage.getItem(storageKeys.authToken)}` });

function SeloEscala({ escala, compacto = false }: { escala: number; compacto?: boolean }) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-md border ${compacto ? "text-[10px] px-1.5 py-px" : "text-[11px] px-2 py-0.5"} ${COR_ESCALA[escala]}`}>
      {compacto ? `E${escala}` : nomeEscala(escala)}
    </span>
  );
}

export default function ControleEscala() {
  const toast = useToast();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [dadosMes, setDadosMes] = useState<Mes | null>(null);
  const [carregandoMes, setCarregandoMes] = useState(true);

  const [diaSel, setDiaSel] = useState(hojeChave());
  const [dia, setDia] = useState<Dia | null>(null);
  const [carregandoDia, setCarregandoDia] = useState(false);

  // Registro de ausência inline na linha do profissional.
  const [ausenciaAberta, setAusenciaAberta] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [remarcando, setRemarcando] = useState<ConsultaARemarcar | null>(null);

  const carregarMes = useCallback(async () => {
    setCarregandoMes(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/mes?ano=${ano}&mes=${mes}`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar a escala do mês."); return; }
      setDadosMes(await res.json());
    } catch {
      toast.error("Falha de conexão ao carregar a escala.");
    } finally {
      setCarregandoMes(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes]);

  const carregarDia = useCallback(async () => {
    setCarregandoDia(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/dia?data=${diaSel}`, { headers: authHeaders() });
      if (!res.ok) { toast.error("Erro ao carregar o plantão do dia."); return; }
      setDia(await res.json());
    } catch {
      toast.error("Falha de conexão ao carregar o plantão.");
    } finally {
      setCarregandoDia(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSel]);

  useEffect(() => { carregarMes(); }, [carregarMes]);
  useEffect(() => { carregarDia(); setAusenciaAberta(null); setMotivo(""); }, [carregarDia]);

  const recarregar = () => { carregarMes(); carregarDia(); };

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };
  const irParaHoje = () => {
    setAno(hoje.getFullYear());
    setMes(hoje.getMonth() + 1);
    setDiaSel(hojeChave());
  };

  const registrarAusencia = async (profissionalId: string) => {
    if (!motivo.trim()) { toast.warning("Informe o motivo da ausência."); return; }
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/ausencias`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ profissionalId, data: diaSel, motivo: motivo.trim() }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      const { consultasARemarcar } = await res.json();
      toast.success(consultasARemarcar > 0
        ? `Ausência registrada. ${consultasARemarcar} consulta(s) precisam ser remarcadas.`
        : "Ausência registrada. A agenda do profissional foi fechada neste dia.");
      setAusenciaAberta(null);
      setMotivo("");
      recarregar();
    } catch {
      toast.error("Falha de conexão ao registrar a ausência.");
    } finally {
      setSalvando(false);
    }
  };

  const removerAusencia = async (ausenciaId: string) => {
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/Escala/ausencias/${ausenciaId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success("Ausência removida. A agenda do profissional foi reaberta.");
      recarregar();
    } catch {
      toast.error("Falha de conexão ao remover a ausência.");
    } finally {
      setSalvando(false);
    }
  };

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const escalaHoje = escalaDoDia(hoje);
  const resumoHoje = dadosMes?.dias.find(d => d.data.slice(0, 10) === hojeChave());
  const aRemarcarNoMes = dadosMes?.dias.reduce((s, d) => s + d.consultasARemarcar, 0) ?? 0;
  const composicao = (e: number) => dadosMes?.composicao.find(c => c.escala === e);

  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulasVazias = Array.from({ length: primeiroDiaSemana });
  const diaSelDate = dataLocal(diaSel);
  const diaPassado = diaSel < hojeChave();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Resumo ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2].map(e => (
          <StatCard key={e} icon={<CalendarClock className="w-[18px] h-[18px]" />} tone={e === escalaHoje ? "brand" : "neutral"} label={nomeEscala(e)} layout="inline">
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="font-bold text-[22px] leading-none text-ink">{composicao(e)?.medicos ?? "–"}</span>
              <span className="text-xs text-body -ml-2">médicos</span>
              <span className="font-bold text-[22px] leading-none text-ink">{composicao(e)?.enfermeiras ?? "–"}</span>
              <span className="text-xs text-body -ml-2">enfermeiras</span>
            </div>
            <div className="text-xs text-muted mt-1">{quandoTrabalha(e)}</div>
          </StatCard>
        ))}
        <StatCard
          icon={<Stethoscope className="w-[18px] h-[18px]" />}
          tone="success"
          label="De plantão hoje"
          value={resumoHoje ? resumoHoje.medicos + resumoHoje.enfermeiras : "–"}
          sub={resumoHoje ? `${nomeEscala(resumoHoje.escala)} · ${resumoHoje.ausencias} ausente(s)` : "abra o mês atual"}
        />
        <StatCard
          icon={<CalendarX2 className="w-[18px] h-[18px]" />}
          tone={aRemarcarNoMes > 0 ? "danger" : "neutral"}
          valueTone={aRemarcarNoMes > 0 ? "danger" : undefined}
          label="A remarcar"
          value={aRemarcarNoMes}
          sub="consultas no mês sem profissional de plantão"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* ── Calendário do mês ─────────────────────────────────────────────── */}
        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-ink mr-auto">{NOMES_MES[mes - 1]} de {ano}</h3>
            <Button variant="secondary" size="sm" onClick={irParaHoje}>Hoje</Button>
            <button onClick={() => mudarMes(-1)} className="w-8 h-8 grid place-items-center border border-line rounded-md text-body hover:bg-canvas" aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => mudarMes(1)} className="w-8 h-8 grid place-items-center border border-line rounded-md text-body hover:bg-canvas" aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={recarregar} className="w-8 h-8 grid place-items-center border border-line rounded-md text-body hover:bg-canvas" aria-label="Atualizar">
              <RefreshCw className={`w-4 h-4 ${carregandoMes ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-muted uppercase tracking-wide">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {celulasVazias.map((_, i) => <div key={`v${i}`} />)}
              {(dadosMes?.dias ?? []).map(d => {
                const k = d.data.slice(0, 10);
                const numero = Number(k.slice(8, 10));
                const selecionado = k === diaSel;
                const ehHoje = k === hojeChave();
                const passado = k < hojeChave();
                const desfalque = !passado && (d.medicos === 0 || d.enfermeiras === 0);
                return (
                  <button
                    key={k}
                    onClick={() => setDiaSel(k)}
                    className={`min-h-[92px] p-2 rounded-md border text-left flex flex-col gap-1 transition-colors ${
                      selecionado ? "border-brand-600 ring-2 ring-brand-600/20" : desfalque ? "border-warning-border" : "border-line"
                    } ${passado ? "bg-canvas/60" : "bg-white hover:bg-canvas"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${ehHoje ? "w-6 h-6 grid place-items-center rounded-full bg-brand-600 text-white" : passado ? "text-muted" : "text-ink"}`}>{numero}</span>
                      <SeloEscala escala={d.escala} compacto />
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${d.medicos === 0 && !passado ? "text-warning-text font-semibold" : "text-body"}`} title="Médicos de plantão">
                      <Stethoscope className="w-3 h-3 shrink-0" /> {d.medicos} méd.
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${d.enfermeiras === 0 && !passado ? "text-warning-text font-semibold" : "text-body"}`} title="Enfermeiras de plantão">
                      <HeartPulse className="w-3 h-3 shrink-0" /> {d.enfermeiras} enf.
                    </div>
                    {(d.ausencias > 0 || d.consultasARemarcar > 0) && (
                      <div className="flex items-center gap-1.5 mt-auto">
                        {d.ausencias > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning-text bg-warning-tint border border-warning-border rounded px-1" title="Ausências">
                            <UserX className="w-2.5 h-2.5" /> {d.ausencias}
                          </span>
                        )}
                        {d.consultasARemarcar > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-danger bg-danger-tint border border-danger-border rounded px-1" title="Consultas a remarcar">
                            <CalendarX2 className="w-2.5 h-2.5" /> {d.consultasARemarcar}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-body">
              <span className="flex items-center gap-1.5"><SeloEscala escala={1} compacto /> Escala 1</span>
              <span className="flex items-center gap-1.5"><SeloEscala escala={2} compacto /> Escala 2</span>
              <span className="flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-warning-text" /> ausências</span>
              <span className="flex items-center gap-1.5"><CalendarX2 className="w-3.5 h-3.5 text-danger" /> consultas a remarcar</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-warning-border" /> dia sem médico ou sem enfermeira</span>
            </div>
          </div>
        </div>

        {/* ── Plantão do dia ────────────────────────────────────────────────── */}
        <div className="bg-white border border-line rounded-lg overflow-hidden lg:sticky lg:top-4">
          <div className="px-5 py-4 border-b border-line">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink capitalize">
                {diaSelDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
              </h3>
              {dia && <SeloEscala escala={dia.escala} />}
            </div>
            <p className="text-[13px] text-muted mt-0.5">Plantão das 07:00 às 19:00 · pausa das 12:00 às 13:00</p>
          </div>

          {carregandoDia || !dia ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-md bg-line-soft animate-pulse" />)}
            </div>
          ) : (
            <div className="divide-y divide-line">
              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2.5">
                  Profissionais da escala ({dia.profissionais.filter(p => !p.ausencia).length} de {dia.profissionais.length} presentes)
                </p>
                {dia.profissionais.length === 0 ? (
                  <p className="text-sm text-body">Nenhum profissional cadastrado nesta escala.</p>
                ) : (
                  <ul className="space-y-2">
                    {dia.profissionais.map(p => (
                      <li key={p.id} className={`rounded-md border px-3 py-2.5 ${p.ausencia ? "border-warning-border bg-warning-tint/40" : "border-line"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-600 grid place-items-center font-semibold text-[13px] uppercase">
                            {p.nome.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${p.ausencia ? "text-body line-through" : "text-ink"}`}>{p.nome}</p>
                            <p className="text-xs text-muted truncate">
                              {p.tipo === perfis.medico ? "Médico" : "Enfermeira"}
                              {p.especialidades.length > 0 && ` · ${p.especialidades.map(e => ESPECIALIDADES[e - 1]).join(", ")}`}
                              {` · ${p.consultas} consulta(s)`}
                            </p>
                          </div>
                          {!diaPassado && !p.ausencia && ausenciaAberta !== p.id && (
                            <Button variant="ghost" size="sm" onClick={() => { setAusenciaAberta(p.id); setMotivo(""); }}>
                              Ausência
                            </Button>
                          )}
                        </div>

                        {p.ausencia && (
                          <div className="flex items-start justify-between gap-2 mt-2 text-xs text-warning-text">
                            <span className="flex items-start gap-1.5">
                              <UserX className="w-3.5 h-3.5 shrink-0 mt-px" />
                              <span>Ausente: {p.ausencia.motivo}{p.ausencia.registradoPor && <span className="text-muted"> · por {p.ausencia.registradoPor}</span>}</span>
                            </span>
                            {!diaPassado && (
                              <button onClick={() => removerAusencia(p.ausencia!.id)} disabled={salvando} className="font-semibold text-body hover:text-ink underline-offset-2 hover:underline shrink-0">
                                Remover
                              </button>
                            )}
                          </div>
                        )}

                        {ausenciaAberta === p.id && (
                          <div className="mt-2.5 space-y-2">
                            <input
                              autoFocus
                              maxLength={200}
                              value={motivo}
                              onChange={e => setMotivo(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") registrarAusencia(p.id); if (e.key === "Escape") setAusenciaAberta(null); }}
                              placeholder="Motivo (ex.: atestado médico, folga, imprevisto)"
                              className="w-full h-9 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus placeholder:text-muted"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setAusenciaAberta(null)} disabled={salvando}>Cancelar</Button>
                              <Button variant="primary" size="sm" onClick={() => registrarAusencia(p.id)} disabled={salvando}>Registrar ausência</Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {diaPassado && <p className="text-xs text-muted mt-3">Dia passado: as ausências ficam só para consulta.</p>}
              </div>

              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2.5">
                  Consultas a remarcar ({dia.consultasARemarcar.length})
                </p>
                {dia.consultasARemarcar.length === 0 ? (
                  <p className="text-sm text-body">Nenhuma consulta afetada neste dia.</p>
                ) : (
                  <ul className="space-y-2">
                    {dia.consultasARemarcar.map(c => (
                      <li key={c.id} className="rounded-md border border-danger-border bg-danger-tint/40 px-3 py-2.5 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {c.dataHoraConsulta.slice(11, 16)} · {c.paciente}
                          </p>
                          <p className="text-xs text-body truncate">
                            {MapNomesTipoConsulta[c.tipoConsulta] ?? c.tipoConsulta} com {c.profissional}
                          </p>
                          <p className="text-[11px] text-danger font-medium flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> {c.motivo === "Ausência" ? "Profissional ausente" : "Profissional fora da escala do dia"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setRemarcando(c)}>Remarcar</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
