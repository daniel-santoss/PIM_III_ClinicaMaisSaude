import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, CLINIC_NAME } from "../constants/api";
import logoPng from "../assets/logo_clinica.png";
import bgImage from "../assets/itens_medicos_background.png";
import { ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, MailCheck } from "lucide-react";
import { isCpfValido, isEmailValido, mascaraCpf, mascaraTelefone } from "../utils/validators";
import { useToast } from "../hooks/useToast";
import { TERMOS_DATA, TERMOS_SECOES, TERMOS_VERSAO } from "../constants/termos";

type Pergunta = { perguntaId: string; pergunta: string; ordem: number };
type Modelo = { modeloId: string; nome: string; perguntas: Pergunta[] };
type RespostaState = { resposta: boolean | null; detalhe: string };

// Etapas do wizard: termos -> dados -> confirmação do e-mail -> declaração de saúde -> sucesso.
type Etapa = "termos" | "dados" | "codigo" | "ds" | "sucesso";

const soDigitos = (v: string) => v.replace(/\D/g, "");

// Rascunho do wizard (resiliente a recarregar a página): guarda termos + dados +
// o token de e-mail JÁ confirmado, para o usuário não repetir a verificação de e-mail
// se precisar voltar depois. NÃO guardamos as respostas da declaração de saúde (dado sensível).
const RASCUNHO_KEY = "clinica.autocadastro.rascunho";
const RASCUNHO_TTL_MS = 6 * 60 * 60 * 1000;   // descarta o rascunho após 6h (limita dado antigo em máquina compartilhada)
const TOKEN_EMAIL_TTL_MS = 30 * 60 * 1000;    // casa com ExpiracaoTokenMin (30 min) do VerificacaoEmailService

// A API responde erros como ProblemDetails ({ message/detail, ... }). Nunca mostrar o JSON cru:
// extrai a mensagem amigável e cai num texto padrão se não houver.
async function lerErro(res: Response, padrao: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.message || data?.detail || padrao;
}

export default function AutoCadastro({ onVoltar }: { onVoltar: () => void }) {
  const toast = useToast();

  const [etapa, setEtapa] = useState<Etapa>("termos");
  const [carregando, setCarregando] = useState(true);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [falha, setFalha] = useState(false);

  // Termos
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Dados
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [temProblemaMemoria, setTemProblemaMemoria] = useState(false);

  // Confirmação de e-mail
  const [codigo, setCodigo] = useState("");
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  // Quando o token de e-mail expira (epoch ms). Usado para decidir se dá para retomar na DS.
  const [tokenEmailExpiraEm, setTokenEmailExpiraEm] = useState<number | null>(null);

  // Declaração de saúde
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});

  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Só persistimos o rascunho depois de tentar restaurar — evita sobrescrever o
  // salvo com o estado inicial vazio no primeiro render.
  const hidratadoRef = useRef(false);

  const limparRascunho = () => {
    try { localStorage.removeItem(RASCUNHO_KEY); } catch { /* storage indisponível */ }
  };

  // Restaura o rascunho ao abrir. `modeloOk` indica se a DS está disponível (sem ela
  // não dá para retomar na etapa de saúde). O token de e-mail só é reaproveitado se
  // ainda estiver dentro da validade (30 min).
  const restaurarRascunho = (modeloOk: boolean) => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(RASCUNHO_KEY); } catch { return; }
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object") return;
      if (!d.savedAt || Date.now() - d.savedAt > RASCUNHO_TTL_MS) { limparRascunho(); return; }

      setNome(d.nome ?? "");
      setCpf(d.cpf ?? "");
      setEmail(d.email ?? "");
      setTelefone(d.telefone ?? "");
      setTemProblemaMemoria(!!d.temProblemaMemoria);
      setAceitouTermos(!!d.aceitouTermos);

      let etapaAlvo: Etapa = d.etapa ?? "termos";

      const tokenValido = d.tokenEmail && d.tokenEmailExpiraEm && Date.now() < d.tokenEmailExpiraEm;
      if (tokenValido) {
        setTokenEmail(d.tokenEmail);
        setTokenEmailExpiraEm(d.tokenEmailExpiraEm);
      } else if (etapaAlvo === "ds") {
        // A confirmação de e-mail expirou: não dá para retomar na DS; volta aos dados.
        etapaAlvo = "dados";
        toast.error("Sua confirmação de e-mail expirou. Confirme o e-mail novamente.");
      }

      if (etapaAlvo === "ds" && !modeloOk) etapaAlvo = "dados";
      if (etapaAlvo === "sucesso") { limparRascunho(); return; }
      setEtapa(etapaAlvo);
    } catch {
      /* rascunho corrompido: ignora */
    }
  };

  useEffect(() => {
    (async () => {
      let modeloOk = false;
      try {
        const res = await fetch(`${API_URL}/api/AutoCadastro/declaracao`);
        if (res.status === 404) {
          setModelo(null);
        } else if (!res.ok) {
          setFalha(true);
        } else {
          const data: Modelo = await res.json();
          setModelo(data);
          setRespostas(Object.fromEntries(data.perguntas.map(p => [p.perguntaId, { resposta: null, detalhe: "" }])));
          modeloOk = true;
        }
      } catch {
        setFalha(true);
      } finally {
        setCarregando(false);
      }
      restaurarRascunho(modeloOk);
      hidratadoRef.current = true;
    })();
  }, []);

  // Salva o rascunho a cada mudança relevante (depois de hidratar).
  useEffect(() => {
    if (!hidratadoRef.current) return;
    if (etapa === "sucesso") return; // no sucesso, o rascunho é limpo
    try {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify({
        etapa, nome, cpf, email, telefone, temProblemaMemoria, aceitouTermos,
        tokenEmail, tokenEmailExpiraEm, savedAt: Date.now(),
      }));
    } catch { /* storage cheio/indisponível: ignora */ }
  }, [etapa, nome, cpf, email, telefone, temProblemaMemoria, aceitouTermos, tokenEmail, tokenEmailExpiraEm]);

  const perguntas = useMemo(() => (modelo ? [...modelo.perguntas].sort((a, b) => a.ordem - b.ordem) : []), [modelo]);

  const setResposta = (id: string, resposta: boolean) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], resposta } }));
  const setDetalhe = (id: string, detalhe: string) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], detalhe } }));

  // ---------------- Transições ----------------

  const validarDados = (): string | null => {
    if (!nome.trim()) return "Informe o nome completo.";
    if (!isCpfValido(cpf)) return "Informe um CPF válido.";
    if (!isEmailValido(email)) return "Informe um e-mail válido.";
    const tel = soDigitos(telefone);
    if (tel.length !== 10 && tel.length !== 11) return "Informe um telefone com DDD (10 ou 11 dígitos).";
    return null;
  };

  const enviarCodigo = async () => {
    const msg = validarDados();
    if (msg) { setErro(msg); toast.error(msg); return; }
    setErro(null);
    setOcupado(true);
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/verificar-email/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) { const t = await lerErro(res, "Não foi possível enviar o código."); setErro(t); toast.error(t); return; }
      setCodigo("");
      setTokenEmail(null);
      setTokenEmailExpiraEm(null);
      setEtapa("codigo");
      toast.success("Enviamos um código para o seu e-mail.");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  };

  const confirmarCodigo = async () => {
    const cod = codigo.trim().toUpperCase();
    if (cod.length !== 6) { setErro("Digite o código de 6 caracteres."); return; }
    setErro(null);
    setOcupado(true);
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/verificar-email/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), codigo: cod }),
      });
      if (!res.ok) { const t = await lerErro(res, "Código inválido ou expirado."); setErro(t); toast.error(t); return; }
      const data = await res.json();
      setTokenEmail(data.token);
      setTokenEmailExpiraEm(Date.now() + TOKEN_EMAIL_TTL_MS);
      setEtapa("ds");
      toast.success("E-mail confirmado!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  };

  const validarDS = (): string | null => {
    for (const p of perguntas) {
      const r = respostas[p.perguntaId];
      if (!r || r.resposta === null) return "Responda todas as perguntas da declaração de saúde.";
      if (r.resposta && !r.detalhe.trim()) return "As respostas \"Sim\" exigem um detalhamento.";
    }
    return null;
  };

  const enviarSolicitacao = async () => {
    if (!modelo || !tokenEmail) return;
    const msg = validarDS();
    if (msg) { setErro(msg); toast.error(msg); return; }
    setErro(null);
    setOcupado(true);
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: soDigitos(cpf),
          email: email.trim(),
          telefone: soDigitos(telefone),
          temProblemaMemoria,
          aceiteTermos: aceitouTermos,
          emailVerificadoToken: tokenEmail,
          modeloId: modelo.modeloId,
          respostas: perguntas.map(p => {
            const r = respostas[p.perguntaId];
            return { perguntaId: p.perguntaId, resposta: !!r.resposta, detalhe: r.resposta ? r.detalhe.trim() : null };
          }),
        }),
      });
      if (!res.ok) { const t = await lerErro(res, "Não foi possível enviar a solicitação."); setErro(t); toast.error(t); return; }
      const data = await res.json().catch(() => null);
      limparRascunho(); // cadastro concluído: descarta o rascunho
      setSucesso(data?.mensagem ?? "Solicitação enviada!");
      setEtapa("sucesso");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  };

  // ---------------- Estilos ----------------
  const inputCls = "w-full h-11 px-4 text-sm text-ink bg-white border border-line rounded-lg outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted";
  const labelCls = "text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block";
  const btnPrimario = "w-full h-12 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
  const spinner = <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />;

  const passos: { chave: Etapa; rotulo: string }[] = [
    { chave: "termos", rotulo: "Termos" },
    { chave: "dados", rotulo: "Dados" },
    { chave: "codigo", rotulo: "E-mail" },
    { chave: "ds", rotulo: "Saúde" },
  ];
  const idxAtual = passos.findIndex(p => p.chave === etapa);

  const Stepper = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {passos.map((p, i) => {
        const feito = etapa === "sucesso" || i < idxAtual;
        const atual = i === idxAtual;
        return (
          <div key={p.chave} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold border transition-colors ${
              atual ? "bg-brand-600 text-white border-brand-600"
                : feito ? "bg-success-tint text-success border-success-border"
                : "bg-white text-muted border-line"
            }`}>
              <span>{feito ? "✓" : i + 1}</span>
              <span className="hidden sm:inline">{p.rotulo}</span>
            </div>
            {i < passos.length - 1 && <div className={`w-3 h-px ${i < idxAtual ? "bg-success-border" : "bg-line"}`} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="min-h-screen w-full bg-canvas bg-cover bg-center flex justify-center overflow-y-auto"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="w-full max-w-2xl px-4 py-8">
        <button
          onClick={onVoltar}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-body bg-white/90 border border-line rounded-lg h-9 px-3 mb-4 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </button>

        <div className="bg-white/97 backdrop-blur rounded-2xl border border-line shadow-modal p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <img src={logoPng} alt={CLINIC_NAME} className="w-16 h-16 object-contain mb-2" />
            <h1 className="text-xl font-bold text-ink">Criar cadastro</h1>
          </div>

          {carregando ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          ) : falha || !modelo ? (
            <div className="flex items-start gap-3 bg-warning-tint border border-warning-border rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning-text leading-relaxed">
                O cadastro on-line está indisponível no momento. Procure a recepção da clínica para se cadastrar presencialmente.
              </p>
            </div>
          ) : etapa === "sucesso" ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <CheckCircle2 className="w-16 h-16 text-success" />
              <h2 className="text-lg font-bold text-ink">Solicitação enviada!</h2>
              <p className="text-sm text-muted leading-relaxed max-w-md">{sucesso}</p>
              <p className="text-[13px] text-muted leading-relaxed max-w-md">
                Enviamos uma confirmação para <strong className="text-ink">{email.trim()}</strong>.
              </p>
              <button onClick={onVoltar} className="mt-3 h-11 px-6 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors">
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <Stepper />

              {/* ---------------- Etapa: Termos ---------------- */}
              {etapa === "termos" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-brand-600" />
                    <h3 className="text-sm font-bold text-ink">Termos de uso e proteção de dados</h3>
                  </div>
                  <div className="bg-canvas border border-line rounded-lg p-4 max-h-64 overflow-y-auto text-[13px] text-body leading-relaxed space-y-3">
                    {TERMOS_SECOES.map(sec => (
                      <section key={sec.titulo}>
                        <h4 className="text-[13px] font-semibold text-ink mb-0.5">{sec.titulo}</h4>
                        <p>{sec.texto}</p>
                      </section>
                    ))}
                    <p className="text-muted text-[12px]">Versão {TERMOS_VERSAO} — {TERMOS_DATA}.</p>
                  </div>

                  <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
                    <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-brand-600" />
                    <span className="text-[13px] text-body leading-snug">
                      Li e aceito os termos de uso e autorizo o tratamento dos meus dados pessoais conforme descrito acima.
                    </span>
                  </label>

                  <button onClick={() => setEtapa("dados")} disabled={!aceitouTermos} className={`${btnPrimario} mt-5`}>
                    Continuar
                  </button>
                </div>
              )}

              {/* ---------------- Etapa: Dados ---------------- */}
              {etapa === "dados" && (
                <div>
                  <h3 className="text-sm font-bold text-ink mb-3">Seus dados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Nome completo</label>
                      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} disabled={ocupado} />
                    </div>
                    <div>
                      <label className={labelCls}>CPF</label>
                      <input value={cpf} onChange={e => setCpf(mascaraCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} className={inputCls} disabled={ocupado} />
                    </div>
                    <div>
                      <label className={labelCls}>Telefone</label>
                      <input value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} placeholder="(11) 99999-9999" inputMode="tel" maxLength={15} className={inputCls} disabled={ocupado} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>E-mail</label>
                      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" autoCapitalize="none" className={inputCls} disabled={ocupado} />
                      <p className="text-[11px] text-muted mt-1">Enviaremos um código para confirmar este e-mail.</p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
                    <input type="checkbox" checked={temProblemaMemoria} onChange={e => setTemProblemaMemoria(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-brand-600" disabled={ocupado} />
                    <span className="text-[13px] text-body leading-snug">Tenho dificuldade de memória e posso precisar de apoio</span>
                  </label>

                  {erro && <p className="text-sm text-danger font-medium mt-3">{erro}</p>}

                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setErro(null); setEtapa("termos"); }} disabled={ocupado}
                      className="h-12 px-5 text-sm font-semibold text-body bg-white border border-line rounded-lg hover:bg-canvas transition-colors">
                      Voltar
                    </button>
                    <button onClick={enviarCodigo} disabled={ocupado} className={btnPrimario}>
                      {ocupado ? <>{spinner} Enviando…</> : "Enviar código de verificação"}
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- Etapa: Confirmação do e-mail ---------------- */}
              {etapa === "codigo" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MailCheck className="w-5 h-5 text-brand-600" />
                    <h3 className="text-sm font-bold text-ink">Confirme seu e-mail</h3>
                  </div>
                  <p className="text-[13px] text-muted leading-relaxed mb-4">
                    Enviamos um código de 6 caracteres para <strong className="text-ink">{email.trim()}</strong>.
                    Digite-o abaixo para continuar.
                  </p>

                  <label className={labelCls}>Código de verificação</label>
                  <input
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    placeholder="ABC123"
                    maxLength={6}
                    className={`${inputCls} text-center text-lg font-bold tracking-[0.5em]`}
                    disabled={ocupado}
                  />

                  <button onClick={enviarCodigo} disabled={ocupado}
                    className="text-[13px] font-semibold text-brand-600 hover:text-brand-800 mt-2">
                    Não recebeu? Reenviar código
                  </button>

                  {erro && <p className="text-sm text-danger font-medium mt-3">{erro}</p>}

                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setErro(null); setEtapa("dados"); }} disabled={ocupado}
                      className="h-12 px-5 text-sm font-semibold text-body bg-white border border-line rounded-lg hover:bg-canvas transition-colors">
                      Voltar
                    </button>
                    <button onClick={confirmarCodigo} disabled={ocupado || codigo.length !== 6} className={btnPrimario}>
                      {ocupado ? <>{spinner} Confirmando…</> : "Confirmar e avançar"}
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- Etapa: Declaração de saúde ---------------- */}
              {etapa === "ds" && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MailCheck className="w-4 h-4 text-success" />
                    <span className="text-[12px] font-semibold text-success">E-mail confirmado</span>
                  </div>
                  <h3 className="text-sm font-bold text-ink mb-1">Declaração de saúde</h3>
                  <p className="text-[13px] text-muted leading-relaxed mb-4">
                    Responda às perguntas abaixo. Depois de enviar, compareça à clínica para a{" "}
                    <strong className="text-ink">avaliação presencial</strong>.
                  </p>

                  <div className="flex flex-col gap-4">
                    {perguntas.map((p, i) => {
                      const r = respostas[p.perguntaId];
                      const sim = r?.resposta === true;
                      const nao = r?.resposta === false;
                      return (
                        <div key={p.perguntaId} className="bg-canvas border border-line rounded-lg p-4">
                          <p className="text-sm text-ink mb-2.5 leading-snug">{i + 1}. {p.pergunta}</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setResposta(p.perguntaId, true)} disabled={ocupado}
                              className={`flex-1 h-9 rounded-md text-sm font-semibold border transition-colors ${
                                sim ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-white border-line text-muted hover:bg-white"
                              }`}>Sim</button>
                            <button type="button" onClick={() => setResposta(p.perguntaId, false)} disabled={ocupado}
                              className={`flex-1 h-9 rounded-md text-sm font-semibold border transition-colors ${
                                nao ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-white border-line text-muted hover:bg-white"
                              }`}>Não</button>
                          </div>
                          {sim && (
                            <textarea value={r.detalhe} onChange={e => setDetalhe(p.perguntaId, e.target.value)}
                              placeholder="Detalhe (obrigatório)…" rows={2} disabled={ocupado}
                              className="w-full mt-2.5 px-3 py-2 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus resize-none placeholder:text-muted" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {erro && <p className="text-sm text-danger font-medium mt-3">{erro}</p>}

                  <button onClick={enviarSolicitacao} disabled={ocupado} className={`${btnPrimario} mt-5`}>
                    {ocupado ? <>{spinner} Enviando…</> : "Enviar solicitação"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
