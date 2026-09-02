import { useEffect, useMemo, useState } from "react";
import { API_URL, CLINIC_NAME } from "../constants/api";
import logoPng from "../assets/logo_clinica.png";
import bgImage from "../assets/itens_medicos_background.png";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { isCpfValido, isEmailValido, mascaraCpf, mascaraTelefone } from "../utils/validators";
import { useToast } from "../hooks/useToast";

type Pergunta = { perguntaId: string; pergunta: string; ordem: number };
type Modelo = { modeloId: string; nome: string; perguntas: Pergunta[] };
type RespostaState = { resposta: boolean | null; detalhe: string };

const soDigitos = (v: string) => v.replace(/\D/g, "");

export default function AutoCadastro({ onVoltar }: { onVoltar: () => void }) {
  const toast = useToast();
  const [carregando, setCarregando] = useState(true);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [falha, setFalha] = useState(false);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [temProblemaMemoria, setTemProblemaMemoria] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/AutoCadastro/declaracao`);
        if (res.status === 404) { setModelo(null); return; }
        if (!res.ok) { setFalha(true); return; }
        const data: Modelo = await res.json();
        setModelo(data);
        setRespostas(Object.fromEntries(data.perguntas.map(p => [p.perguntaId, { resposta: null, detalhe: "" }])));
      } catch {
        setFalha(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const perguntas = useMemo(() => (modelo ? [...modelo.perguntas].sort((a, b) => a.ordem - b.ordem) : []), [modelo]);

  const setResposta = (id: string, resposta: boolean) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], resposta } }));
  const setDetalhe = (id: string, detalhe: string) =>
    setRespostas(prev => ({ ...prev, [id]: { ...prev[id], detalhe } }));

  const validar = (): string | null => {
    if (!nome.trim()) return "Informe o nome completo.";
    if (!isCpfValido(cpf)) return "Informe um CPF válido.";
    if (!isEmailValido(email)) return "Informe um e-mail válido.";
    const tel = soDigitos(telefone);
    if (tel && tel.length !== 10 && tel.length !== 11) return "Telefone inválido. Informe DDD + número.";
    for (const p of perguntas) {
      const r = respostas[p.perguntaId];
      if (!r || r.resposta === null) return "Responda todas as perguntas da declaração de saúde.";
      if (r.resposta && !r.detalhe.trim()) return "As respostas \"Sim\" exigem um detalhamento.";
    }
    return null;
  };

  const enviar = async () => {
    if (!modelo) return;
    const msg = validar();
    if (msg) { setErro(msg); toast.error(msg); return; }
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/AutoCadastro/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: soDigitos(cpf),
          email: email.trim(),
          telefone: soDigitos(telefone) || null,
          temProblemaMemoria,
          modeloId: modelo.modeloId,
          respostas: perguntas.map(p => {
            const r = respostas[p.perguntaId];
            return { perguntaId: p.perguntaId, resposta: !!r.resposta, detalhe: r.resposta ? r.detalhe.trim() : null };
          }),
        }),
      });
      if (!res.ok) { const t = await res.text(); setErro(t); toast.error(t || "Não foi possível enviar."); return; }
      const data = await res.json().catch(() => null);
      setSucesso(data?.mensagem ?? "Solicitação enviada!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const inputCls = "w-full h-11 px-4 text-sm text-ink bg-white border border-line rounded-lg outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted";
  const labelCls = "text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block";

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

          {sucesso ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <CheckCircle2 className="w-16 h-16 text-success" />
              <h2 className="text-lg font-bold text-ink">Solicitação enviada!</h2>
              <p className="text-sm text-muted leading-relaxed max-w-md">{sucesso}</p>
              <button
                onClick={onVoltar}
                className="mt-3 h-11 px-6 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          ) : carregando ? (
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
          ) : (
            <>
              <p className="text-[13px] text-muted leading-relaxed mb-6">
                Preencha seus dados e a declaração de saúde. Depois de enviar, compareça à clínica para a{" "}
                <strong className="text-ink">avaliação presencial</strong>. Você será avisado por e-mail sobre a decisão.
              </p>

              {/* Dados */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-ink mb-3">Seus dados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Nome completo</label>
                    <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} disabled={enviando} />
                  </div>
                  <div>
                    <label className={labelCls}>CPF</label>
                    <input value={cpf} onChange={e => setCpf(mascaraCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} className={inputCls} disabled={enviando} />
                  </div>
                  <div>
                    <label className={labelCls}>Telefone (opcional)</label>
                    <input value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} placeholder="(11) 99999-9999" inputMode="tel" maxLength={15} className={inputCls} disabled={enviando} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>E-mail</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" autoCapitalize="none" className={inputCls} disabled={enviando} />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
                  <input type="checkbox" checked={temProblemaMemoria} onChange={e => setTemProblemaMemoria(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-brand-600" disabled={enviando} />
                  <span className="text-[13px] text-body leading-snug">Tenho dificuldade de memória e posso precisar de apoio</span>
                </label>
              </div>

              {/* Declaração de saúde */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-ink mb-3">Declaração de saúde</h3>
                <div className="flex flex-col gap-4">
                  {perguntas.map((p, i) => {
                    const r = respostas[p.perguntaId];
                    const sim = r?.resposta === true;
                    const nao = r?.resposta === false;
                    return (
                      <div key={p.perguntaId} className="bg-canvas border border-line rounded-lg p-4">
                        <p className="text-sm text-ink mb-2.5 leading-snug">{i + 1}. {p.pergunta}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setResposta(p.perguntaId, true)} disabled={enviando}
                            className={`flex-1 h-9 rounded-md text-sm font-semibold border transition-colors ${
                              sim ? "bg-warning-tint border-warning-border text-warning-text" : "bg-white border-line text-muted hover:bg-white"
                            }`}>Sim</button>
                          <button type="button" onClick={() => setResposta(p.perguntaId, false)} disabled={enviando}
                            className={`flex-1 h-9 rounded-md text-sm font-semibold border transition-colors ${
                              nao ? "bg-success-tint border-success-border text-success" : "bg-white border-line text-muted hover:bg-white"
                            }`}>Não</button>
                        </div>
                        {sim && (
                          <textarea value={r.detalhe} onChange={e => setDetalhe(p.perguntaId, e.target.value)}
                            placeholder="Detalhe (obrigatório)…" rows={2} disabled={enviando}
                            className="w-full mt-2.5 px-3 py-2 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus resize-none placeholder:text-muted" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {erro && <p className="text-sm text-danger font-medium mb-3">{erro}</p>}

              <button
                onClick={enviar} disabled={enviando}
                className="w-full h-12 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {enviando ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando…</> : "Enviar solicitação"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
