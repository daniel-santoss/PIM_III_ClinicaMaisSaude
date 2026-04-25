import { useEffect, useState } from "react";

export interface AgendamentoResponse {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  medicoId: string;
  dataHoraConsulta: string;
  status: string;
}

export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function AgendamentoList() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([]);
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshContador, setRefreshContador] = useState(0);

  // Form states
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [dataLocal, setDataLocal] = useState("");
  const [medicoIdMock] = useState("00000000-0000-0000-0000-000000000000"); // Temporário

  useEffect(() => {
    carregarDados();
  }, [refreshContador]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Usa Promise.all para carregar simultaneamente os dados que vão popular a tela
      const [resAgendamentos, resPacientes] = await Promise.all([
        fetch("http://localhost:5045/api/Agendamentos"),
        fetch("http://localhost:5045/api/Pacientes")
      ]);

      if (!resAgendamentos.ok || !resPacientes.ok) {
        throw new Error("Erro ao carregar dados do servidor.");
      }

      setAgendamentos(await resAgendamentos.json());
      setPacientes(await resPacientes.json());
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const criarAgendamento = async () => {
    if (!pacienteSelecionado || !dataLocal) {
      alert("Por favor, selecione um paciente e uma data/hora válida.");
      return;
    }

    try {
      const dataIso = new Date(dataLocal).toISOString();

      const response = await fetch("http://localhost:5045/api/Agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          medicoId: medicoIdMock,
          dataHoraConsulta: dataIso
        })
      });

      if (!response.ok) {
        const txt = await response.text();
        alert(`Não foi possível agendar:\n${txt}`);
        return;
      }

      setPacienteSelecionado("");
      setDataLocal("");
      setRefreshContador((p) => p + 1);

    } catch (err) {
      alert("Falha de conexão ao criar agendamento.");
    }
  };

  const cancelarAgendamento = async (id: string) => {
    if (!window.confirm("Deseja realmente desmarcar esta consulta?")) return;
    try {
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        alert(await response.text());
        return;
      }
      setRefreshContador((p) => p + 1);
    } catch (e) {
      alert("Erro de conexão ao remover agendamento.");
    }
  };

  if (erro) return <p className="text-red-500 text-center py-4">{erro}</p>;
  if (carregando) return <p className="text-gray-500 text-center py-4">Carregando calendário...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário de Criação Lateral */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Marcar Consulta
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700"
              value={pacienteSelecionado}
              onChange={(e) => setPacienteSelecionado(e.target.value)}
            >
              <option value="">-- Selecionar Paciente --</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
            <input
              type="datetime-local"
              className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all"
              value={dataLocal}
              onChange={(e) => setDataLocal(e.target.value)}
            />
          </div>

          <button
            onClick={criarAgendamento}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded transition-colors shadow-sm"
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>

      {/* Grade de Listagem Visual (Calendário Horizontal / Lista Temporal) */}
      <div className="col-span-1 lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
          Agenda Programada
        </h3>

        {agendamentos.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center border text-gray-500 border-dashed border-gray-300">
            A agenda está vazia no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agendamentos
              .sort((a, b) => new Date(a.dataHoraConsulta).getTime() - new Date(b.dataHoraConsulta).getTime())
              .map((agenda) => {
                const dataObj = new Date(agenda.dataHoraConsulta);
                const dia = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const jaPassou = dataObj < new Date();

                return (
                  <div key={agenda.id} className={`flex items-start bg-white border ${jaPassou ? 'border-gray-200 opacity-60' : 'border-blue-200'} rounded-lg p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                    
                    {/* Borda lateral colorida de indicação */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${jaPassou ? 'bg-gray-300' : 'bg-blue-500'}`}></div>

                    <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-gray-100 pr-4 mr-4">
                      <span className="text-sm font-bold text-blue-600 uppercase">{dia}</span>
                      <span className="text-xl font-bold text-gray-800">{hora}</span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-semibold text-gray-800 text-base truncate">{agenda.pacienteNome}</h4>
                      <p className="text-sm text-gray-500 mt-0.5 capitalize">{agenda.status}</p>
                    </div>

                    {!jaPassou && (
                      <button
                        title="Desmarcar"
                        onClick={() => cancelarAgendamento(agenda.id)}
                        className="p-2 ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    )}
                  </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
