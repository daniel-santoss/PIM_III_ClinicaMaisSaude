import { useEffect, useState } from "react";
import { mascaraCpf } from "../utils/validators";
import type { PacienteResponse } from "../types/PacienteResponse";
import type { AgendamentoResponse } from "./AgendamentoList";

function obterMinDate(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

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

  useEffect(() => {
    setTipoConsulta(tipoProfissional === 0 ? 0 : 3);
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
        const res = await fetch(`http://localhost:5045/api/Agendamentos/horarios-disponiveis?data=${dataSelecionada}&tipoConsulta=${tipoConsulta}`, {
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
  }, [dataSelecionada, tipoConsulta]);

  const pacientesFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) || p.cpf.includes(buscaPaciente));

  const criarAgendamento = async () => {
    if (!pacienteSelecionado || !dataSelecionada || !horarioSelecionado) {
      onMensagem("Por favor, preencha todos os campos e selecione um horário.");
      return;
    }

    if (tipoConsulta === 4 && !origemId) {
      onMensagem("Para agendar retorno, você precisa selecionar a consulta de origem.");
      return;
    }

    const dataHoraUnida = `${dataSelecionada}T${horarioSelecionado}:00`;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5045/api/Agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          dataHoraConsulta: dataHoraUnida,
          tipoProfissional: tipoProfissional,
          tipoConsulta: tipoConsulta,
          agendamentoOrigemId: origemId || null
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-6">
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
                    .filter(a => a.pacienteId === pacienteSelecionado && a.status === "Finalizado")
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.dataHoraConsulta).toLocaleDateString('pt-BR')} - {a.tipoConsulta} ({a.nomeProfissional})
                      </option>
                    ))
                  }
                </select>
                {agendamentos.filter(a => a.pacienteId === pacienteSelecionado && a.status === "Finalizado").length === 0 && (
                  <p className="mt-2 text-[10px] text-red-400 font-bold ml-1 uppercase tracking-tighter">Nenhuma consulta finalizada encontrada para este paciente.</p>
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
                  {horariosDisponiveis.map(h => (
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
                  ))}
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
