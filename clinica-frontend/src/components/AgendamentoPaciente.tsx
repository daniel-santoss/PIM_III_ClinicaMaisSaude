import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { mascaraCpf } from "../utils/validators";
import { ESPECIALIDADES } from "../constants/especialidades";
import { Check, AlertTriangle, Sliders, Zap, CheckCircle, Search, User, Calendar, MessageSquare, AlertCircle, ShieldAlert } from 'lucide-react';

interface AgendamentoPacienteProps {
  onSucesso?: () => void;
}

export default function AgendamentoPaciente({ onSucesso }: AgendamentoPacienteProps) {
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
  const [violacao, setViolacao] = useState(false);

  const [tipoProfissional, setTipoProfissional] = useState<number | null>(null); // 0: Enfermeira, 1: Medico
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
          setViolacao(true);
          return;
        }
        setSugestaoIA(dados);
      } else {
        const erroMsg = await response.text();
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
    fetch(`${API_URL}/api/Especialidades/lista`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setListaEspecialidades)
      .catch(() => {});

    fetch(`${API_URL}/api/Especialidades/disponiveis`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setEspecialidadesDisponiveis)
      .catch(() => {});

    fetch(`${API_URL}/api/Agendamentos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setAgendamentosAnteriores)
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

      if (!response.ok) throw new Error(await response.text());
      setSucesso(true);
      if (onSucesso) setTimeout(onSucesso, 2000);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const isFimDeSemana = (data: string) => {
    const day = new Date(data).getUTCDay();
    return day === 0 || day === 6;
  };

  if (sucesso) return (
    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100 ring-8 ring-green-50">
        <Check className="w-12 h-12" strokeWidth={3} />
      </div>
      <h2 className="text-3xl font-black text-gray-800 mb-2">Tudo Certo!</h2>
      <p className="text-gray-500 font-bold text-center uppercase tracking-widest text-xs mb-10">Consulta agendada com sucesso</p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => { setSucesso(false); setPasso(1); setSintomas(""); setHorarioSelecionado(""); setModoIA(false); }}
          className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all"
        >
          Novo Agendamento
        </button>
        <button
          onClick={() => onSucesso?.()}
          className="flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100 hover:scale-105 transition-all"
        >
          Meus Agendamentos
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Progresso Superior */}
      <div className="flex items-center justify-between px-4 max-w-2xl mx-auto">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="flex flex-col items-center gap-2 relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 z-10 ${passo >= num ? 'bg-[#7C3AED] text-white shadow-xl shadow-purple-200 scale-110' : 'bg-gray-100 text-gray-400'
              }`}>
              {num}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${passo >= num ? 'text-purple-600' : 'text-gray-300'}`}>
              {num === 1 ? 'Sintomas' : num === 2 ? 'Profissional' : num === 3 ? 'Data/Hora' : 'Confirmar'}
            </span>
          </div>
        ))}
        {/* Modal Mensagem de Erro (Estilo Reaproveitado) */}
      {modalMensagem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Aviso</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{modalMensagem}</p>
            <button className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100" onClick={() => setModalMensagem(null)}>Entendido</button>
          </div>
        </div>
      )}
      
      {violacao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-red-900/50 w-full max-w-xl p-10 text-center border-4 border-red-500">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="w-14 h-14" />
            </div>
            <h3 className="text-3xl font-black text-red-700 mb-4 uppercase tracking-tight">Violação de Segurança</h3>
            <div className="text-red-900 text-xs sm:text-sm mb-10 font-bold leading-relaxed text-left space-y-4">
              <p>
                Detectamos uma tentativa deliberada de obtenção de credenciais privadas e ativos de domínio por meio da Inteligência Artificial do sistema. Esta conduta configura Invasão de Dispositivo Informático, conforme o Art. 154-A do Código Penal (Lei 12.737/2012) e violação dos princípios de segurança e confidencialidade da Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD).
              </p>
              <p className="text-red-800 uppercase tracking-widest text-[10px] sm:text-xs">Informamos que:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sua conta foi permanentemente bloqueada.</li>
                <li>O log completo desta interação e evidências técnicas de acesso foram encaminhados ao Administrador do Sistema.</li>
                <li>O incidente foi formalmente registrado para medidas judiciais e administrativas cabíveis.</li>
              </ul>
            </div>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-red-200 transition-colors" onClick={() => setViolacao(false)}>Entendido</button>
          </div>
        </div>
      )}
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-purple-100/50 border border-purple-50">

        {/* ETAPA 1: ESCOLHA INICIAL */}
        {passo === 1 && (
          <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-gray-800">Como deseja prosseguir?</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Selecione uma opção para iniciar seu agendamento</p>
            </div>

            <div className="flex flex-col items-center gap-6">
              {!modoIA ? (
                <div className="flex items-center gap-6 w-full max-w-xl">
                  <button
                    onClick={() => setPasso(2)}
                    className="flex-1 py-8 bg-slate-50 text-[#7C3AED] border-2 border-[#7C3AED]/10 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:bg-[#F5F3FF] hover:border-[#7C3AED] transition-all shadow-sm flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Sliders className="w-6 h-6" />
                    </div>
                    Escolher Manualmente
                  </button>
                  <button
                    onClick={() => setModoIA(true)}
                    className="flex-1 py-8 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-[0_15px_30px_-5px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Zap className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    Ajuda com IA
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-2xl space-y-6 animate-in zoom-in duration-300">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Descreva seus sintomas</p>

                  <div className="relative">
                    <textarea
                      placeholder="Ex: Estou com uma dor persistente no peito que piora ao respirar fundo..."
                      className="w-full h-40 p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-purple-100 focus:border-[#7C3AED] focus:bg-white transition-all outline-none font-bold text-gray-700 resize-none pr-16 pb-10"
                      value={sintomas}
                      onChange={(e) => setSintomas(e.target.value)}
                      maxLength={300}
                    />
                    <span className="absolute bottom-6 right-6 text-[10px] font-black text-purple-300 bg-white/80 px-2 py-0.5 rounded-lg shadow-sm">
                      {sintomas.length}/300
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setModoIA(false)}
                      className="px-8 py-5 bg-slate-50 text-gray-400 border-2 border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 hover:text-gray-600 transition-all shadow-sm"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={analisarSintomas}
                      disabled={!sintomas.trim() || analisandoIA}
                      className="flex-1 py-5 bg-[#7C3AED] text-white rounded-2xl font-black shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {analisandoIA ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" strokeWidth={2.5} />
                          Analisar com IA
                        </>
                      )}
                    </button>
                  </div>

                  {sugestaoIA && (
                    <div className="p-8 bg-purple-50 rounded-[2.5rem] border-2 border-purple-100 animate-in zoom-in duration-300 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Recomendamos:</p>
                          <h4 className="text-xl font-black text-gray-800">{sugestaoIA.tipo} — {sugestaoIA.especialidade}</h4>
                          <p className="text-[10px] font-bold text-gray-500 mt-2 leading-relaxed">
                            Esta é apenas uma sugestão baseada no seu relato. O profissional fará a avaliação completa durante o atendimento.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={usarSugestao} className="flex-1 py-4 bg-[#7C3AED] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100">Usar Sugestão</button>
                        <button onClick={() => setPasso(2)} className="flex-1 py-4 bg-white text-gray-400 border-2 border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-colors">Escolher Outro</button>
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
              <h2 className="text-3xl font-black text-gray-800">Tipo de Atendimento</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Selecione a categoria e especialidade</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Tipo de Consulta</label>
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
                  className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-purple-100 focus:border-[#7C3AED] outline-none font-bold text-gray-700 transition-all"
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
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Especialidade Médica</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar especialidade..."
                        className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-purple-100 focus:border-[#7C3AED] outline-none font-bold text-gray-700 transition-all pl-12"
                        value={buscaEspecialidade}
                        onChange={(e) => setBuscaEspecialidade(e.target.value)}
                      />
                      <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
                    </div>
                    
                    {temIndisponivel && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>As especialidades marcadas não possuem médicos disponíveis no momento.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar mt-4">
                        {filtradas.map(e => {
                          const espObj = listaEspecialidades.find(le => le.nome.toLowerCase() === e.toLowerCase());
                          const isDisponivel = espObj ? especialidadesDisponiveis.includes(espObj.id) : false;
                          
                          return (
                            <button
                              key={e}
                              disabled={!isDisponivel}
                              onClick={() => setEspecialidade(e)}
                              className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-row items-center justify-center gap-2 ${
                                !isDisponivel 
                                  ? 'border-red-100 bg-red-50 text-red-400 opacity-70 cursor-not-allowed'
                                  : especialidade === e
                                  ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]'
                                  : 'border-gray-100 hover:border-purple-200 text-gray-500 hover:text-[#7C3AED] bg-white'
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Consulta de Origem</label>
                  <select
                    value={origemId}
                    onChange={(e) => setOrigemId(e.target.value)}
                    className="w-full p-5 bg-purple-50 border-2 border-purple-100 rounded-[1.5rem] focus:ring-4 focus:ring-purple-200 focus:border-[#7C3AED] outline-none font-bold text-[#7C3AED] transition-all"
                  >
                    <option value="">Selecione a consulta anterior...</option>
                    {agendamentosAnteriores
                      .filter(a => a.status === "AguardandoRetorno")
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {new Date(a.dataHoraConsulta).toLocaleDateString('pt-BR')} - {a.tipoConsulta} ({a.nomeProfissional})
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

            <div className="flex justify-between pt-4">
              <button onClick={() => setPasso(1)} className="px-10 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">Voltar</button>
              <button
                disabled={(tipoConsulta === 3 && !especialidade) || (tipoConsulta === 4 && !origemId)}
                onClick={() => setPasso(3)}
                className="px-10 py-4 bg-[#7C3AED] text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:scale-105 transition-all disabled:opacity-50"
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
              <h2 className="text-3xl font-black text-gray-800">Quando?</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Selecione uma data e horário disponível</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Data da Consulta</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={dataSelecionada}
                  onChange={(e) => {
                    if (isFimDeSemana(e.target.value)) {
                      setErro("Infelizmente não atendemos aos finais de semana.");
                      return;
                    }
                    setErro(null);
                    setDataSelecionada(e.target.value);
                  }}
                  className="w-full p-6 bg-purple-50/50 border-2 border-purple-100 rounded-[2rem] focus:ring-4 focus:ring-purple-200 outline-none transition-all font-bold text-gray-700"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Horários</label>
                {carregandoHorarios ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
                  </div>
                ) : dataSelecionada ? (
                  horariosDisponiveis.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {horariosDisponiveis.map(h => {
                        const isSelecionado = horarioSelecionado === h;

                        return (
                          <button
                            key={h}
                            onClick={() => setHorarioSelecionado(h)}
                            className={`py-4 rounded-xl font-black text-[11px] transition-all border-2 shadow-sm ${isSelecionado
                                ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-100 scale-105'
                                : 'bg-[#7C3AED] text-white border-[#7C3AED] hover:bg-[#6D28D9] hover:shadow-md'
                              }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="col-span-3 p-6 flex flex-col items-center justify-center text-center bg-orange-50 border border-orange-100 rounded-[2rem]">
                      <AlertTriangle className="w-8 h-8 text-orange-400 mb-2" />
                      <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Nenhum horário disponível</p>
                      <p className="text-[10px] text-orange-500 font-medium mt-1">
                        Não há médicos desta especialidade disponíveis na data informada.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-10 bg-gray-50 rounded-[2rem] text-center border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Escolha uma data primeiro</p>
                  </div>
                )}
              </div>
            </div>

            {erro && <p className="text-center text-red-500 text-[10px] font-black uppercase">{erro}</p>}

            <div className="flex justify-between pt-4">
              <button onClick={() => setPasso(2)} className="px-10 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">Voltar</button>
              <button
                disabled={!dataSelecionada || !horarioSelecionado}
                onClick={() => setPasso(4)}
                className="px-10 py-4 bg-[#7C3AED] text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:scale-105 transition-all disabled:opacity-50"
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
              <h2 className="text-3xl font-black text-gray-800">Quase lá!</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Confira as informações antes de confirmar</p>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-purple-100/30 border-4 border-purple-400 overflow-hidden">
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* Bloco 1: O que e Quem */}
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-100">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Especialidade e Profissional</p>
                      <h4 className="text-xl font-black text-gray-800 leading-tight">
                        {especialidade || (tipoConsulta === 1 ? 'Exame' : tipoConsulta === 2 ? 'Vacina' : 'Consulta')}
                      </h4>
                      <p className="text-sm font-bold text-purple-600 uppercase tracking-tight mt-1">
                        {tipoProfissional === 1 ? 'Médico Especialista' : 'Atendimento de Enfermaria'}
                      </p>
                    </div>
                  </div>

                  {/* Bloco 2: Quando */}
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-100">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data e Horário</p>
                      <h4 className="text-xl font-black text-gray-800 leading-tight">
                        {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </h4>
                      <p className="text-sm font-bold text-purple-600 uppercase tracking-tight mt-1">às {horarioSelecionado} horas</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full"></div>

                {/* Bloco 3: Notas */}
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shrink-0 border border-gray-100">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Relato de Sintomas / Observações</p>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 min-h-[60px]">
                      <p className="text-sm font-medium text-gray-500 italic">
                        {sintomas ? `"${sintomas}"` : "Nenhuma observação adicional relatada."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 flex items-center justify-center gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Confira tudo com atenção, pois esta ação é definitiva.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
              <button
                onClick={() => setPasso(3)}
                className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 hover:text-gray-600 transition-all"
              >
                Voltar e Alterar
              </button>
              <button
                disabled={carregando}
                onClick={finalizarAgendamento}
                className="flex-1 py-5 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_15px_30px_-5px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {carregando ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" strokeWidth={2.5} />
                    Confirmar Agendamento Agora
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
