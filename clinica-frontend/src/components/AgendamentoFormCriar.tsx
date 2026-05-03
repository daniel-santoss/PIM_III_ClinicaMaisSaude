import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { mascaraCpf } from "../utils/validators";
import { obterMinDate } from "../utils/dates";
import type { PacienteResponse } from "../types/PacienteResponse";
import type { AgendamentoResponse } from "./AgendamentoList";
import { X, Lightbulb, AlertTriangle } from 'lucide-react';

interface AgendamentoFormCriarProps {
  pacientes: PacienteResponse[];
  agendamentos: AgendamentoResponse[];
  onFechar: () => void;
  onCriado: () => void;
  onMensagem: (msg: string) => void;
}

export default function AgendamentoFormCriar({
  pacientes,
  agendamentos,
  onFechar,
  onCriado,
  onMensagem,
}: AgendamentoFormCriarProps) {
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [tipoProfissional, setTipoProfissional] = useState(0);
  const [tipoConsulta, setTipoConsulta] = useState(0);
  const [origemId, setOrigemId] = useState("");
  const [especialidadeId, setEspecialidadeId] = useState<number | null>(null);
  const [listaEspecialidades, setListaEspecialidades] = useState<{id: number, nome: string}[]>([]);
  const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState<number[]>([]);
  const [sintomas, setSintomas] = useState("");
  const [sugestaoIA, setSugestaoIA] = useState<any>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);

  useEffect(() => {
    setTipoConsulta(tipoProfissional === 0 ? 0 : 3);
    setEspecialidadeId(null);
  }, [tipoProfissional]);

  useEffect(() => {
    if (tipoProfissional === 1 && listaEspecialidades.length === 0) {
      const token = localStorage.getItem("authToken");
      fetch(`${API_URL}/api/Especialidades/lista`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setListaEspecialidades)
        .catch(() => {});

      fetch(`${API_URL}/api/Especialidades/disponiveis`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setEspecialidadesDisponiveis)
        .catch(() => {});
    }
  }, [tipoProfissional]);

  useEffect(() => {
    const fetchHorarios = async () => {
      if (!dataSelecionada) {
        setHorariosDisponiveis([]);
        setHorarioSelecionado("");
        return;
      }
      setCarregandoHorarios(true);
      try {
        const token = localStorage.getItem("authToken");
        let queryParams = `?data=${dataSelecionada}&tipoConsulta=${tipoConsulta}`;
        if (tipoConsulta === 3 && especialidadeId) {
          queryParams += `&especialidadeId=${especialidadeId}`;
        } else if (tipoConsulta === 4 && origemId) {
          queryParams += `&origemId=${origemId}`;
        }

        const res = await fetch(`${API_URL}/api/Agendamentos/horarios-disponiveis${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setHorariosDisponiveis(await res.json());
        }
      } catch (e) {
        console.error("Erro ao carregar horários", e);
      } finally {
        setCarregandoHorarios(false);
      }
    };
    fetchHorarios();
  }, [dataSelecionada, tipoConsulta, especialidadeId, origemId]);

  const pacientesFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) || p.cpf.includes(buscaPaciente));

  const criarAgendamento = async () => {
    if (!pacienteSelecionado || !dataSelecionada || !horarioSelecionado) {
      onMensagem("Por favor, preencha todos os campos e selecione um horário.");
      return;
    }

    if (tipoProfissional === 1 && tipoConsulta === 3 && !especialidadeId) {
      onMensagem("Selecione uma especialidade médica para prosseguir.");
      return;
    }

    if (tipoConsulta === 4 && !origemId) {
      onMensagem("Para agendar retorno, você precisa selecionar a consulta de origem.");
      return;
    }

    const dataHoraUnida = `${dataSelecionada}T${horarioSelecionado}:00`;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/Agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          dataHoraConsulta: dataHoraUnida,
          tipoProfissional: tipoProfissional,
          tipoConsulta: tipoConsulta,
          agendamentoOrigemId: origemId || null,
          especialidadeId: tipoProfissional === 1 ? especialidadeId : null
        })
      });

      if (!response.ok) {
        onMensagem(await response.text());
        return;
      }

      onCriado();
    } catch (err) {
      onMensagem("Falha de conexão ao criar agendamento.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-purple-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-purple-100">
        <div className="p-8 border-b border-purple-50 flex items-center justify-between bg-purple-50/30">
          <div>
            <h3 className="text-2xl font-black text-gray-800">Novo Agendamento</h3>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Preencha os detalhes da consulta</p>
          </div>
          <button onClick={onFechar} className="p-2 text-gray-400 hover:bg-white rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Triagem por IA */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-500" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Triagem Inteligente (IA)</span>
              </div>
              <textarea
                className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
                rows={2}
                placeholder="Descreva os sintomas do paciente para sugestão automática..."
                value={sintomas}
                onChange={(e) => setSintomas(e.target.value)}
                maxLength={500}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={carregandoIA || sintomas.length < 10}
                  onClick={async () => {
                    setCarregandoIA(true); setSugestaoIA(null);
                    try {
                      const token = localStorage.getItem("authToken");
                      const res = await fetch(`${API_URL}/api/Consultas/sugerir-tipo`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ sintomas })
                      });
                      if (res.ok) {
                        const dados = await res.json();
                        setSugestaoIA(dados);
                        // Auto-preencher
                        if (dados.tipoProfissional === "Medico") { setTipoProfissional(1); }
                        else { setTipoProfissional(0); }
                        if (dados.tipoConsulta === "Triagem") setTipoConsulta(0);
                        else if (dados.tipoConsulta === "Exame") setTipoConsulta(1);
                        else if (dados.tipoConsulta === "Vacina") setTipoConsulta(2);
                        else if (dados.tipoConsulta === "Consulta Médica") setTipoConsulta(3);
                        else if (dados.tipoConsulta === "Retorno") setTipoConsulta(4);
                        // Auto-preencher especialidade
                        if (dados.especialidade && listaEspecialidades.length > 0) {
                          const match = listaEspecialidades.find(e => e.nome === dados.especialidade);
                          if (match) setEspecialidadeId(match.id);
                        }
                      } else { onMensagem(await res.text()); }
                    } catch { onMensagem("Falha ao consultar IA."); }
                    finally { setCarregandoIA(false); }
                  }}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {carregandoIA ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analisando...</>
                  ) : (
                    <>Sugerir com IA</>
                  )}
                </button>
                {sugestaoIA && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">Sugestão aplicada!</span>
                )}
              </div>
              {sugestaoIA?.justificativa && (
                <p className="text-xs text-indigo-700 bg-white p-3 rounded-xl border border-indigo-50 italic">{sugestaoIA.justificativa}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Paciente</label>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-[#7C3AED] focus:bg-white transition-all outline-none font-bold text-sm"
                value={buscaPaciente}
                onChange={(e) => {
                  setBuscaPaciente(e.target.value);
                  setMostrarListaPacientes(true);
                  setPacienteSelecionado("");
                  setOrigemId("");
                }}
              />
              {mostrarListaPacientes && (
                <div className="absolute z-[70] w-full bg-white border border-purple-100 mt-2 max-h-48 overflow-y-auto rounded-2xl shadow-2xl">
                  {pacientesFiltrados.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                      onClick={() => {
                        setPacienteSelecionado(p.id);
                        setBuscaPaciente(p.nome);
                        setMostrarListaPacientes(false);
                      }}
                    >
                      <div className="font-black text-gray-800 text-sm">{p.nome}</div>
                      <div className="text-[10px] font-bold text-purple-400">CPF: {mascaraCpf(p.cpf)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Especialidade</label>
                <select
                  className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-[#7C3AED] focus:bg-white outline-none font-bold text-sm"
                  value={tipoProfissional}
                  onChange={(e) => setTipoProfissional(Number(e.target.value))}
                >
                  <option value={0}>Enfermeira</option>
                  <option value={1}>Médico</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipo Consulta</label>
                <select
                  className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-[#7C3AED] focus:bg-white outline-none font-bold text-sm"
                  value={tipoConsulta}
                  onChange={(e) => setTipoConsulta(Number(e.target.value))}
                >
                  {tipoProfissional === 0 ? (
                    <>
                      <option value={0}>Triagem</option>
                      <option value={1}>Exame</option>
                      <option value={2}>Vacina</option>
                    </>
                  ) : (
                    <>
                      <option value={3}>Consulta Médica</option>
                      <option value={4}>Retorno</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {tipoProfissional === 1 && tipoConsulta !== 4 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Especialidade Médica</label>
                {listaEspecialidades.some(e => !especialidadesDisponiveis.includes(e.id)) && (
                  <div className="flex items-center gap-2 p-2.5 mb-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-[9px] font-bold uppercase tracking-widest">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Especialidades com ⚠ não possuem médicos no momento.</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {listaEspecialidades.map(e => {
                    const disponivel = especialidadesDisponiveis.includes(e.id);
                    const selecionado = especialidadeId === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        disabled={!disponivel}
                        onClick={() => setEspecialidadeId(e.id)}
                        className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                          !disponivel
                            ? 'border-red-100 bg-red-50 text-red-300 cursor-not-allowed'
                            : selecionado
                            ? 'border-[#7C3AED] bg-[#7C3AED] text-white shadow-lg shadow-purple-100'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {e.nome}
                        {!disponivel && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tipoConsulta === 4 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Consulta de Origem</label>
                <select
                  className="w-full p-4 border border-purple-200 rounded-2xl bg-purple-50/30 focus:ring-2 focus:ring-[#7C3AED] focus:bg-white outline-none font-bold text-sm"
                  value={origemId}
                  onChange={(e) => setOrigemId(e.target.value)}
                >
                  <option value="">Selecione a consulta anterior...</option>
                  {agendamentos
                    .filter(a => a.pacienteId === pacienteSelecionado && a.status === "AguardandoRetorno")
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.dataHoraConsulta).toLocaleDateString('pt-BR')} - {a.tipoConsulta} ({a.nomeProfissional})
                      </option>
                    ))
                  }
                </select>
                {agendamentos.filter(a => a.pacienteId === pacienteSelecionado && a.status === "AguardandoRetorno").length === 0 && (
                  <p className="mt-2 text-[10px] text-red-400 font-bold ml-1 uppercase tracking-tighter">Nenhuma consulta pendente de retorno para este paciente.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                <input
                  type="date"
                  className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-[#7C3AED] focus:bg-white outline-none font-bold text-sm"
                  value={dataSelecionada}
                  min={obterMinDate()}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Horário Selecionado: <span className="text-[#7C3AED]">{horarioSelecionado || '...'}</span></label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {carregandoHorarios ? (
                    <div className="col-span-4 p-4 flex justify-center">
                      <div className="w-5 h-5 border-2 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
                    </div>
                  ) : dataSelecionada && horariosDisponiveis.length === 0 ? (
                    <div className="col-span-4 p-4 flex flex-col items-center justify-center text-center bg-orange-50 border border-orange-100 rounded-2xl">
                      <AlertTriangle className="w-8 h-8 text-orange-400 mb-2" />
                      <p className="text-xs font-bold text-orange-600">Nenhum horário disponível.</p>
                      <p className="text-[10px] text-orange-500 font-medium mt-1">
                        Não há médicos desta especialidade disponíveis na data informada.
                      </p>
                    </div>
                  ) : (
                    horariosDisponiveis.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorarioSelecionado(h)}
                        className={`py-2.5 text-[11px] font-black rounded-xl border transition-all ${horarioSelecionado === h
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-purple-100'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                      >
                        {h}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button onClick={onFechar} className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all">Cancelar</button>
            <button onClick={async () => { await criarAgendamento(); }} className="flex-2 px-8 py-4 bg-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#6D28D9] shadow-lg shadow-purple-200 transition-all">Finalizar Agendamento</button>
          </div>
        </div>
      </div>
    </div>
  );
}
