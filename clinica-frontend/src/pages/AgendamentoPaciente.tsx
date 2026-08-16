import { API_URL, ADMIN_EMAIL, MAX_PROMPT_LENGTH, CLINIC_PHONE } from "../constants/api";
import { useEffect, useState } from "react";

import { ESPECIALIDADES } from "../constants/especialidades";
import { AlertCircle, Calendar, Zap, Check, AlertTriangle, Sliders, CheckCircle, Search, User, MessageSquare } from 'lucide-react';
import { getRealDate, obterMinDate } from '../utils/dates';
import { useScrollBlock } from "../hooks/useScrollBlock";

interface AgendamentoPacienteProps {
  onSucesso?: () => void;
  dadosPrePreenchidos?: {
    tipoProfissional: number;
    tipoConsulta: number;
    especialidade: string;
  } | null;
  onLimparPrePreenchidos?: () => void;
}

export default function AgendamentoPaciente({
  onSucesso,
  dadosPrePreenchidos,
  onLimparPrePreenchidos
}: AgendamentoPacienteProps) {
  const [passo, setPasso] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Estados do Agendamento
  const [sintomas, setSintomas] = useState("");
  const [sugestaoIA, setSugestaoIA] = useState<any>(null);
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [modoIA, setModoIA] = useState(false);
  const [modalMensagem, setModalMensagem] = useState<string | null>(null);

  useScrollBlock(!!(modalMensagem || analisandoIA));

  const [tipoProfissional, setTipoProfissional] = useState<number | null>(1); // 0: Enfermeira, 1: Medico
  const [tipoConsulta, setTipoConsulta] = useState<number>(3); // Default 3: Consulta Médica
  const [especialidade, setEspecialidade] = useState("");
  const [buscaEspecialidade, setBuscaEspecialidade] = useState("");
  const [listaEspecialidades, setListaEspecialidades] = useState<{id: number, nome: string}[]>([]);
  const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState<number[]>([]);

  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [origemId, setOrigemId] = useState("");
  const [agendamentosAnteriores, setAgendamentosAnteriores] = useState<any[]>([]);

  const pacienteId = localStorage.getItem("pacienteId");
  const token = localStorage.getItem("authToken");

  const analisarSintomas = async () => {
    if (!sintomas.trim()) return;
    setAnalisandoIA(true);
    setSugestaoIA(null);

    try {
      const response = await fetch(`${API_URL}/api/Consultas/sugerir-tipo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sintomas })
      });

      if (response.ok) {
        const dados = await response.json();
        if (dados.justificativa?.includes("Detectamos uma tentativa deliberada")) {
          window.dispatchEvent(new CustomEvent("segurancaViolada"));
          return;
        }
        setSugestaoIA(dados);
      } else {
        const raw = await response.text();
        let erroMsg = raw;
        try { const j = JSON.parse(raw); erroMsg = j.message || j.detail || j.title || raw; } catch { /* corpo não-JSON: usa texto puro */ }
        setModalMensagem(erroMsg);
      }
    } catch (e) {
      setModalMensagem("Falha de conexão com a Inteligência Artificial.");
    } finally {
      setAnalisandoIA(false);
    }
  };

  const usarSugestao = () => {
    if (sugestaoIA) {
      // Converte os textos da IA para os Enums inteiros do front-end
      let profInt = 1; // Médico
      if (sugestaoIA.tipoProfissional === "Enfermeira") profInt = 0;

      let consInt = 3; // Consulta Médica
      if (sugestaoIA.tipoConsulta === "Triagem") consInt = 0;
      else if (sugestaoIA.tipoConsulta === "Exame") consInt = 1;
      else if (sugestaoIA.tipoConsulta === "Vacina") consInt = 2;
      else if (sugestaoIA.tipoConsulta === "Retorno") consInt = 4;

      setTipoProfissional(profInt);
      setTipoConsulta(consInt);
      setEspecialidade(sugestaoIA.especialidade);
      setPasso(3); // Pula direto para a seleção de Data/Hora
    }
  };

  useEffect(() => {
    if (dadosPrePreenchidos) {
      setTipoProfissional(dadosPrePreenchidos.tipoProfissional);
      setTipoConsulta(dadosPrePreenchidos.tipoConsulta);
      setEspecialidade(dadosPrePreenchidos.especialidade);
      setPasso(3);
    }
  }, [dadosPrePreenchidos]);

  useEffect(() => {
    fetch(`${API_URL}/api/Especialidades/lista`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setListaEspecialidades)
      .catch(() => {});

    fetch(`${API_URL}/api/Especialidades/disponiveis`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setEspecialidadesDisponiveis)
      .catch(() => {});

    fetch(`${API_URL}/api/Agendamentos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setAgendamentosAnteriores(data.items ?? data))
      .catch(() => {});
  }, [token]);

  // Buscar horários
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!dataSelecionada || tipoConsulta === null) return;
      setCarregandoHorarios(true);
      try {
        let queryParams = `?data=${dataSelecionada}&tipoConsulta=${tipoConsulta}`;
        
        if (tipoConsulta === 3 && especialidade) {
           const esp = listaEspecialidades.find(e => e.nome.toLowerCase() === especialidade.toLowerCase());
           if (esp) queryParams += `&especialidadeId=${esp.id}`;
        } else if (tipoConsulta === 4 && origemId) {
           queryParams += `&origemId=${origemId}`;
        }
        
        const res = await fetch(`${API_URL}/api/Agendamentos/horarios-disponiveis${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setHorariosDisponiveis(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setCarregandoHorarios(false);
      }
    };
    fetchHorarios();
  }, [dataSelecionada, tipoConsulta, especialidade, origemId, listaEspecialidades, token]);

  const finalizarAgendamento = async () => {
    setCarregando(true);
    setErro(null);
    try {
      let espId = null;
      if (tipoConsulta === 3 && especialidade) {
        const esp = listaEspecialidades.find(e => e.nome.toLowerCase() === especialidade.toLowerCase());
        if (esp) espId = esp.id;
      }

      const response = await fetch(`${API_URL}/api/Agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          pacienteId,
          dataHoraConsulta: `${dataSelecionada}T${horarioSelecionado}:00`,
          tipoProfissional: tipoProfissional ?? 1,
          tipoConsulta,
          agendamentoOrigemId: origemId || null,
          especialidadeId: espId,
          observacao: sintomas // Usando sintomas como observação
        })
      });

      if (!response.ok) {
        const raw = await response.text();
        let msg = raw;
        try { const j = JSON.parse(raw); msg = j.message || j.detail || j.title || raw; } catch { /* corpo não-JSON: usa texto puro */ }
        throw new Error(msg);
      }
      setSucesso(true);
      onLimparPrePreenchidos?.();
      if (onSucesso) setTimeout(onSucesso, 2000);
    } catch (err: any) {
      if (err.message.includes("60 dias") || err.message.includes("recente") || err.message.includes("Recente")) {
        setModalMensagem(err.message);
      } else {
        setErro(err.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  const isFimDeSemana = (data: string) => {
    const day = new Date(data).getUTCDay();
    return day === 0 || day === 6;
  };

  if (sucesso) return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-success-tint text-success rounded-full grid place-items-center mb-5">
        <Check className="w-8 h-8" strokeWidth={2.5} />
      </div>
      <h2 className="text-xl font-semibold text-ink mb-1">Tudo certo!</h2>
      <p className="text-muted text-center text-sm mb-8">Consulta agendada com sucesso.</p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={() => { setSucesso(false); setPasso(1); setSintomas(""); setHorarioSelecionado(""); setModoIA(false); onLimparPrePreenchidos?.(); }}
          className="flex-1 h-11 inline-flex items-center justify-center rounded-md text-sm font-semibold text-body bg-white border border-line hover:bg-canvas transition-colors"
        >
          Novo agendamento
        </button>
        <button
          onClick={() => { onLimparPrePreenchidos?.(); onSucesso?.(); }}
          className="flex-1 h-11 inline-flex items-center justify-center rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors"
        >
          Meus agendamentos
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4 xl:px-0">
      {/* Progresso Superior */}
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {[1, 2, 3, 4].map((num, i) => (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-lg grid place-items-center font-semibold text-sm transition-colors ${
                passo === num ? 'bg-brand-600 text-white' : passo > num ? 'bg-brand-50 text-brand-600' : 'bg-[#EEF2F7] text-muted'
              }`}>
                {num}
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                passo >= num ? 'text-brand-600' : 'text-muted'
              }`}>
                {num === 1 ? 'Início' : num === 2 ? 'Tipo' : num === 3 ? 'Horário' : 'OK'}
              </span>
            </div>
            {i < 3 && <div className={`w-14 h-0.5 mx-2 mb-5 ${passo > num ? 'bg-brand-600' : 'bg-line'}`} />}
          </div>
        ))}
        {/* Modal Mensagem de Erro (Estilo Reaproveitado) */}
      {modalMensagem && (() => {
        const is60DiasBlock = modalMensagem.includes("60 dias") || modalMensagem.includes("recente") || modalMensagem.includes("Recente");
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4">
            <div className="bg-white rounded-xl shadow-modal w-full max-w-sm p-6 text-center border border-line">
              <div className="w-12 h-12 bg-warning-tint text-warning rounded-lg grid place-items-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1.5">
                {is60DiasBlock ? "Consulta recente" : "Aviso"}
              </h3>
              <p className="text-body text-[13px] mb-5 leading-relaxed">
                {modalMensagem}
              </p>
              {is60DiasBlock && (
                <div className="bg-canvas border border-line rounded-md p-4 mb-5 text-left">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wide block mb-1">Como proceder:</span>
                  <p className="text-[13px] text-body leading-normal">
                    Entre em contato com nossa recepção pelo telefone <strong className="text-brand-600">{CLINIC_PHONE}</strong> e solicite o agendamento informando o <strong className="text-ink">motivo da consulta</strong> para a atendente ou enfermeira de plantão.
                  </p>
                </div>
              )}
              <button
                className="w-full h-11 bg-brand-600 text-white font-semibold text-sm rounded-md border border-brand-600 hover:bg-brand-800 transition-colors"
                onClick={() => setModalMensagem(null)}
              >
                Entendido
              </button>
              {!is60DiasBlock && (
                <a
                  href={`mailto:${ADMIN_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20de%20revis%C3%A3o%20de%20bloqueio%20-%20${localStorage.getItem("userName") || "[Seu Nome]"}`}
                  className="w-full h-11 mt-2.5 inline-flex items-center justify-center bg-white text-body border border-line font-semibold text-sm rounded-md hover:bg-canvas transition-colors"
                >
                  Acredito que isso é um erro
                </a>
              )}
            </div>
          </div>
        );
      })()}
      </div>

      <div className="bg-white rounded-xl p-8 border border-line">

        {/* ETAPA 1: ESCOLHA INICIAL */}
        {passo === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-7">
              <h2 className="text-xl font-semibold text-ink">Como deseja prosseguir?</h2>
              <p className="text-sm text-muted mt-1">Selecione uma opção para iniciar seu agendamento.</p>
            </div>

            <div className="flex flex-col items-center gap-6">
              {!modoIA ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:max-w-lg">
                  <button
                    onClick={() => setPasso(2)}
                    className="p-6 bg-white text-ink border border-line rounded-lg hover:bg-canvas hover:border-brand-600 transition-colors flex flex-col items-center text-center"
                  >
                    <div className="w-11 h-11 mb-3 rounded-lg grid place-items-center bg-[#EEF2F7] text-body">
                      <Sliders className="w-[22px] h-[22px]" />
                    </div>
                    <div className="font-semibold text-sm text-ink">Escolher manualmente</div>
                    <div className="text-xs text-muted mt-1">Selecione especialidade e horário</div>
                  </button>
                  <button
                    onClick={() => setModoIA(true)}
                    className="p-6 bg-brand-600 text-white border border-brand-600 rounded-lg hover:bg-brand-800 hover:border-brand-800 transition-colors flex flex-col items-center text-center"
                  >
                    <div className="w-11 h-11 mb-3 rounded-lg grid place-items-center bg-white/15 text-white">
                      <Zap className="w-[22px] h-[22px]" />
                    </div>
                    <div className="font-semibold text-sm text-white">Ajuda com IA</div>
                    <div className="text-xs text-white/75 mt-1">Triagem inteligente por sintomas</div>
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-600 uppercase tracking-wide mb-2.5">
                      <Zap className="w-[15px] h-[15px]" /> Triagem inteligente (IA)
                    </div>
                    <div className="relative">
                      <textarea
                        placeholder="Descreva os sintomas para sugestão automática..."
                        className="w-full h-28 p-3 text-sm text-ink bg-white border border-brand-200 rounded-md focus:border-brand-600 focus:shadow-focus transition-shadow outline-none resize-none placeholder:text-muted"
                        value={sintomas}
                        onChange={(e) => setSintomas(e.target.value)}
                        maxLength={MAX_PROMPT_LENGTH}
                      />
                      <span className="absolute bottom-2.5 right-3 text-[11px] font-medium text-muted bg-white/80 px-1.5 rounded">
                        {sintomas.length}/{MAX_PROMPT_LENGTH}
                      </span>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch justify-end gap-2.5 mt-3">
                      <button
                        onClick={() => setModoIA(false)}
                        className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold text-body bg-white border border-line hover:bg-canvas transition-colors"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={analisarSintomas}
                        disabled={!sintomas.trim() || analisandoIA}
                        className="h-10 px-[18px] inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors disabled:opacity-50"
                      >
                        {analisandoIA ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Analisar com IA
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {sugestaoIA && (
                    <div className="p-5 bg-white rounded-lg border border-line animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-lg grid place-items-center text-brand-600 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Recomendamos:</p>
                          <h4 className="text-[15px] font-semibold text-ink leading-snug">{sugestaoIA.tipo} — {sugestaoIA.especialidade}</h4>
                          <p className="text-xs text-muted mt-2 leading-relaxed">
                            Esta é apenas uma sugestão baseada no seu relato. O profissional fará a avaliação completa durante o atendimento.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-4">
                        <button onClick={usarSugestao} className="flex-1 h-10 bg-brand-600 text-white rounded-md font-semibold text-sm border border-brand-600 hover:bg-brand-800 transition-colors">Usar sugestão</button>
                        <button onClick={() => setPasso(2)} className="flex-1 h-10 bg-white text-body border border-line rounded-md font-semibold text-sm hover:bg-canvas transition-colors">Escolher outro</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 2: ESPECIALIDADE */}
        {passo === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-ink">Tipo de Atendimento</h2>
              <p className="text-sm text-muted mt-1">Selecione a categoria e especialidade</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-body mb-1">Tipo de Consulta</label>
                <select
                  value={tipoConsulta}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTipoConsulta(val);
                    setTipoProfissional(val >= 3 ? 1 : 0);
                    if (val < 3) {
                      setEspecialidade("");
                    }
                  }}
                  className="w-full h-11 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
                >
                  <option value={1}>Exame</option>
                  <option value={2}>Vacina</option>
                  <option value={3}>Consulta Médica</option>
                  <option value={4}>Retorno</option>
                </select>
              </div>

              {tipoConsulta === 3 && (() => {
                const filtradas = ESPECIALIDADES.filter(e => e.toLowerCase().includes(buscaEspecialidade.toLowerCase()));
                const temIndisponivel = filtradas.some(e => {
                  const espObj = listaEspecialidades.find(le => le.nome.toLowerCase() === e.toLowerCase());
                  return !(espObj ? especialidadesDisponiveis.includes(espObj.id) : false);
                });

                return (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <label className="block text-[13px] font-medium text-body mb-1">Especialidade Médica</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar especialidade..."
                        className="w-full h-11 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted"
                        value={buscaEspecialidade}
                        onChange={(e) => setBuscaEspecialidade(e.target.value)}
                      />
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    </div>
                    
                    {temIndisponivel && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-warning-tint border border-warning-border text-warning-text rounded-md text-[13px] font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>As especialidades marcadas não possuem médicos disponíveis no momento.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar mt-4">
                        {filtradas.map(e => {
                          const espObj = listaEspecialidades.find(le => le.nome.toLowerCase() === e.toLowerCase());
                          const isDisponivel = espObj ? especialidadesDisponiveis.includes(espObj.id) : false;
                          
                          return (
                            <button
                              key={e}
                              disabled={!isDisponivel}
                              onClick={() => setEspecialidade(e)}
                              className={`h-12 px-3.5 rounded-md border text-[13px] transition-colors text-center flex items-center justify-center gap-2 ${
                                !isDisponivel
                                  ? 'border-line bg-canvas text-muted cursor-not-allowed'
                                  : especialidade === e
                                  ? 'border-brand-600 bg-brand-50 text-brand-600 font-semibold'
                                  : 'border-line hover:border-brand-200 text-body bg-white font-medium'
                              }`}
                            >
                              <span>{e}</span>
                              {!isDisponivel && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}

              {tipoConsulta === 4 && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <label className="block text-[13px] font-medium text-body mb-1">Consulta de Origem</label>
                  <select
                    value={origemId}
                    onChange={(e) => setOrigemId(e.target.value)}
                    className="w-full h-11 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
                  >
                    <option value="">Selecione a consulta anterior...</option>
                    {agendamentosAnteriores
                      .filter(a => a.status === "AguardandoRetorno")
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {getRealDate(a.dataHoraConsulta)!.toLocaleDateString('pt-BR')} - {a.tipoConsulta} ({a.nomeProfissional})
                        </option>
                      ))
                    }
                  </select>
                  {agendamentosAnteriores.filter(a => a.status === "AguardandoRetorno").length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-tighter">Você não tem nenhuma consulta pendente de retorno.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
              <button onClick={() => setPasso(1)} className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold text-body bg-white border border-line hover:bg-canvas transition-colors">Voltar</button>
              <button
                disabled={(tipoConsulta === 3 && !especialidade) || (tipoConsulta === 4 && !origemId)}
                onClick={() => setPasso(3)}
                className="h-10 px-[18px] inline-flex items-center justify-center rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors disabled:opacity-50"
              >
                Próximo Passo
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: DATA E HORA */}
        {passo === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-ink">Quando?</h2>
              <p className="text-sm text-muted mt-1">Selecione uma data e horário disponível</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="block text-[13px] font-medium text-body mb-1">Data da Consulta</label>
                <input
                  type="date"
                  min={obterMinDate()}
                  value={dataSelecionada}
                  onChange={(e) => {
                    if (isFimDeSemana(e.target.value)) {
                      setErro("Infelizmente não atendemos aos finais de semana.");
                      return;
                    }
                    setErro(null);
                    setDataSelecionada(e.target.value);
                  }}
                  className="w-full h-11 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[13px] font-medium text-body mb-1">Horários</label>
                {carregandoHorarios ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-[3px] border-line border-t-brand-600 rounded-full animate-spin"></div>
                  </div>
                ) : dataSelecionada ? (
                  horariosDisponiveis.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {horariosDisponiveis.map(h => {
                        const isSelecionado = horarioSelecionado === h;

                        return (
                          <button
                            key={h}
                            onClick={() => setHorarioSelecionado(h)}
                            className={`h-10 rounded-md text-[13px] transition-colors border ${isSelecionado
                                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                                : 'bg-white text-body border-line hover:bg-canvas font-medium'
                              }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="col-span-3 p-5 flex flex-col items-center justify-center text-center bg-warning-tint border border-warning-border rounded-md">
                      <AlertTriangle className="w-6 h-6 text-warning mb-2" />
                      <p className="text-[13px] font-semibold text-warning-text">Nenhum horário disponível</p>
                      <p className="text-xs text-warning-text/80 mt-1">
                        Não há médicos desta especialidade disponíveis na data informada.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-8 bg-canvas rounded-md text-center border border-line">
                    <p className="text-muted text-[13px] font-medium">Escolha uma data primeiro</p>
                  </div>
                )}
              </div>
            </div>

            {erro && <p className="text-center text-danger text-[13px] font-medium">{erro}</p>}

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
              <button onClick={() => { setPasso(2); onLimparPrePreenchidos?.(); }} className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold text-body bg-white border border-line hover:bg-canvas transition-colors">Voltar</button>
              <button
                disabled={!dataSelecionada || !horarioSelecionado}
                onClick={() => setPasso(4)}
                className="h-10 px-[18px] inline-flex items-center justify-center rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors disabled:opacity-50"
              >
                Próximo Passo
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: CONFIRMAÇÃO */}
        {passo === 4 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-ink">Quase lá!</h2>
              <p className="text-sm text-muted mt-1">Confira as informações antes de confirmar</p>
            </div>

            <div className="bg-white rounded-lg border border-line overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* Bloco 1: O que e Quem */}
                  <div className="flex items-start gap-5">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg grid place-items-center text-brand-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Especialidade e Profissional</p>
                      <h4 className="text-[15px] font-semibold text-ink leading-tight">
                        {especialidade || (tipoConsulta === 1 ? 'Exame' : tipoConsulta === 2 ? 'Vacina' : 'Consulta')}
                      </h4>
                      <p className="text-xs font-medium text-brand-600 mt-1">
                        {tipoProfissional === 1 ? 'Médico Especialista' : 'Atendimento de Enfermaria'}
                      </p>
                    </div>
                  </div>

                  {/* Bloco 2: Quando */}
                  <div className="flex items-start gap-5">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg grid place-items-center text-brand-600 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Data e Horário</p>
                      <h4 className="text-[15px] font-semibold text-ink leading-tight">
                        {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </h4>
                      <p className="text-xs font-medium text-brand-600 mt-1">às {horarioSelecionado} horas</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-line w-full"></div>

                {/* Bloco 3: Notas */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-canvas rounded-lg grid place-items-center text-muted shrink-0 border border-line">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Relato de Sintomas / Observações</p>
                    <div className="p-3.5 bg-canvas rounded-md border border-line min-h-[52px]">
                      <p className="text-[13px] text-muted italic">
                        {sintomas ? `"${sintomas}"` : "Nenhuma observação adicional relatada."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-canvas px-6 py-3 border-t border-line flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <p className="text-[13px] font-medium text-body">Confira tudo com atenção — esta ação é definitiva.</p>
              </div>
            </div>

            {erro && (
              <div className="px-4 py-3 bg-danger-tint border border-danger-border text-danger rounded-md text-[13px] font-medium text-center animate-in fade-in duration-300">
                {erro}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
              <button
                onClick={() => { setErro(null); setPasso(3); }}
                className="h-11 px-[18px] inline-flex items-center justify-center rounded-md text-sm font-semibold text-body bg-white border border-line hover:bg-canvas transition-colors"
              >
                Voltar e alterar
              </button>
              <button
                disabled={carregando}
                onClick={finalizarAgendamento}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold text-white bg-brand-600 border border-brand-600 hover:bg-brand-800 transition-colors disabled:opacity-50"
              >
                {carregando ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle className="w-[18px] h-[18px]" />
                    Confirmar agendamento
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
