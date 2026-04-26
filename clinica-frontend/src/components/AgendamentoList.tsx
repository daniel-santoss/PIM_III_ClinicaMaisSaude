import { useEffect, useState } from "react";

export interface AgendamentoResponse {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  medicoId: string;
  dataHoraConsulta: string;
  tipoProfissional: string;
  tipoConsulta: string;
  status: string;
  agendamentoOrigemId?: string;
}

export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

const EnumTipoProfissional = {
  0: "Enfermeira",
  1: "Médico"
};

const EnumTipoConsulta = {
  0: "Triagem",
  1: "Exame",
  2: "Vacina",
  3: "Consulta Médica",
  4: "Retorno"
};

// 6 representa o novo status "Cancelado"
const EnumStatusUrl = {
  "Agendado": 0,
  "EmAtendimento": 1,
  "AguardandoRetorno": 2,
  "RetornoAgendado": 3,
  "Finalizado": 4,
  "Faltou": 5,
  "Cancelado": 6
};

// Mapeamento amigável para dropdown
const MapNomesStatus: Record<string, string> = {
  "Agendado": "Agendado",
  "EmAtendimento": "Em Atendimento",
  "AguardandoRetorno": "Aguardando Retorno",
  "RetornoAgendado": "Retorno Agendado",
  "Finalizado": "Finalizado",
  "Faltou": "Faltou",
  "Cancelado": "Cancelado"
};

function obterMinDateTimeLocal(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

export default function AgendamentoList() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([]);
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshContador, setRefreshContador] = useState(0);

  const isPaciente = localStorage.getItem("tipoUsuario") === "Paciente";

  // Form de criação
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [dataLocal, setDataLocal] = useState("");
  const [medicoIdMock] = useState("00000000-0000-0000-0000-000000000000"); // mantido fixo para simplificar
  
  const [tipoProfissional, setTipoProfissional] = useState(0);
  const [tipoConsulta, setTipoConsulta] = useState(0);
  const [origemId, setOrigemId] = useState("");

  // Modais
  const [modalMensagem, setModalMensagem] = useState<string | null>(null);
  const [cancelarAlvo, setCancelarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterarAlvo, setAlterarAlvo] = useState<AgendamentoResponse | null>(null);
  const [alterarData, setAlterarData] = useState("");
  const [alterando, setAlterando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [refreshContador]);

  useEffect(() => {
    setTipoConsulta(tipoProfissional === 0 ? 0 : 3);
  }, [tipoProfissional]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers = { "Authorization": `Bearer ${token}` };
      const [resAgendamentos, resPacientes] = await Promise.all([
        fetch("http://localhost:5045/api/Agendamentos", { headers }),
        fetch("http://localhost:5045/api/Pacientes", { headers })
      ]);

      if (!resAgendamentos.ok || !resPacientes.ok) throw new Error("Erro ao carregar dados do servidor.");

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
      setModalMensagem("Por favor, preencha todos os campos.");
      return;
    }

    if (tipoConsulta === 4 && !origemId) {
      setModalMensagem("Para agendar retorno, você precisa selecionar a consulta de origem.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5045/api/Agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          dataHoraConsulta: dataLocal,
          tipoProfissional: tipoProfissional,
          tipoConsulta: tipoConsulta,
          agendamentoOrigemId: origemId || null
        })
      });

      if (!response.ok) {
        setModalMensagem(await response.text());
        return;
      }

      setPacienteSelecionado("");
      setDataLocal("");
      setOrigemId("");
      setRefreshContador(p => p + 1);
    } catch (err) {
      setModalMensagem("Falha de conexão ao criar agendamento.");
    }
  };

  // Alterado: Cancelamento físico (DELETE) virou mudança para status (PATCH Cancelado)
  const confirmarCancelamento = async () => {
    if (!cancelarAlvo) return;
    setCancelando(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${cancelarAlvo.id}/status`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(EnumStatusUrl["Cancelado"]) // Transita para 'Cancelado'
      });
      if (!response.ok) {
        setModalMensagem(await response.text());
        return;
      }
      setCancelarAlvo(null);
      setRefreshContador(p => p + 1);
    } catch (e) {
      setModalMensagem("Erro de conexão ao remover agendamento.");
    } finally {
      setCancelando(false);
    }
  };

  const confirmarAlteracaoHora = async () => {
    if (!alterarAlvo || !alterarData) return;
    setAlterando(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${alterarAlvo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          pacienteId: alterarAlvo.pacienteId,
          dataHoraConsulta: alterarData,
          tipoConsulta: 0, // Ignorado pelo backend no PUT atual mas necessário no shape base
          tipoProfissional: 0
        })
      });

      if (!response.ok) {
        setModalMensagem(await response.text());
        return;
      }

      setAlterarAlvo(null);
      setAlterarData("");
      setRefreshContador(p => p + 1);
    } catch (err) {
      setModalMensagem("Falha de conexão ao alterar agendamento.");
    } finally {
      setAlterando(false);
    }
  };

  const alterarStatus = async (id: string, novoStatusString: string) => {
    const valorEnum = EnumStatusUrl[novoStatusString as keyof typeof EnumStatusUrl];
    if (valorEnum === undefined) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Agendamentos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(valorEnum)
      });
      
      if (!response.ok) {
        setModalMensagem(await response.text());
      }
      setRefreshContador(p => p + 1);
    } catch (err) {
      setModalMensagem("Falha de conexão.");
    }
  };

  const abrirAlteracao = (agenda: AgendamentoResponse) => {
    setAlterarAlvo(agenda);
    const d = new Date(agenda.dataHoraConsulta);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const hora = String(d.getHours()).padStart(2, "0");
    const minuto = String(d.getMinutes()).padStart(2, "0");
    setAlterarData(`${ano}-${mes}-${dia}T${hora}:${minuto}`);
  };

  // helper para definir opções do Select (Filtro Inteligente)
  const obterOpcoesPermitidas = (statusAtual: string, tipoConsulta: string): string[] => {
    switch (statusAtual) {
      case "Agendado":
        return ["EmAtendimento", "Faltou"];
      case "EmAtendimento":
        return tipoConsulta === "ConsultaMédica" || tipoConsulta === "Consulta Médica" 
          ? ["AguardandoRetorno", "Finalizado"] 
          : ["Finalizado"];
      case "AguardandoRetorno":
        return []; // Transita para RetornoAgendado apenas ao criar o Retorno originado dela
      case "RetornoAgendado":
        return ["Finalizado", "Faltou"];
      default:
        return [];
    }
  };

  const retornosPendentes = agendamentos.filter(a => a.pacienteId === pacienteSelecionado && a.status === "AguardandoRetorno");

  if (erro) return <p className="text-red-500 text-center py-4">{erro}</p>;
  if (carregando) return <p className="text-gray-500 text-center py-4">Carregando calendário...</p>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Criação (ocupa 4 colunas) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
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
                onChange={(e) => { setPacienteSelecionado(e.target.value); setOrigemId(""); }}
              >
                <option value="">-- Selecionar Paciente --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  value={tipoProfissional}
                  onChange={(e) => setTipoProfissional(Number(e.target.value))}
                >
                  <option value={0}>Enfermeira</option>
                  <option value={1}>Médico</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Consulta</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500"
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
              <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                <label className="block text-sm font-medium text-blue-800 mb-1">Consulta de Origem (Aguardando Retorno)</label>
                <select
                  className="w-full p-2.5 border border-blue-200 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
                  value={origemId}
                  onChange={(e) => setOrigemId(e.target.value)}
                >
                  <option value="">-- Selecionar Consulta Inicial --</option>
                  {retornosPendentes.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.dataHoraConsulta).toLocaleDateString('pt-BR')} às {new Date(a.dataHoraConsulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
                {retornosPendentes.length === 0 && pacienteSelecionado && (
                  <p className="text-xs text-red-500 mt-1 mt-2">Paciente não possui consultas "Aguardando Retorno" pendentes.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
              <input
                type="datetime-local"
                className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all"
                value={dataLocal}
                min={obterMinDateTimeLocal()}
                onChange={(e) => setDataLocal(e.target.value)}
              />
            </div>

            <button
              onClick={criarAgendamento}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded transition-colors shadow-sm"
            >
              Criar Agendamento
            </button>
          </div>
        </div>

        {/* Listagem (ocupa 8 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
            Status da Agenda
          </h3>

          {agendamentos.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center border text-gray-500 border-dashed border-gray-300">
              Nenhum agendamento encontrado no sistema.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agendamentos
                .sort((a, b) => new Date(a.dataHoraConsulta).getTime() - new Date(b.dataHoraConsulta).getTime())
                .map((agenda) => {
                  const dataObj = new Date(agenda.dataHoraConsulta);
                  const dia = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  const emAberto = agenda.status === "Agendado" || agenda.status === "EmAtendimento" || agenda.status === "RetornoAgendado" || agenda.status === "AguardandoRetorno";
                  const podeCancelar = agenda.status === "Agendado" || agenda.status === "RetornoAgendado";
                  
                  const opcoesValidas = obterOpcoesPermitidas(agenda.status, agenda.tipoConsulta);

                  return (
                    <div key={agenda.id} className={`flex flex-col bg-white border ${!emAberto ? 'border-gray-200' : 'border-blue-200'} rounded-lg p-0 shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                      
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${!emAberto ? 'bg-gray-300' : 'bg-blue-500'}`}></div>

                      <div className="p-4 flex items-start flex-1 ml-1">
                        <div className="flex flex-col items-center justify-center min-w-[65px] border-r border-gray-100 pr-3 mr-3">
                          <span className="text-xs font-bold text-blue-600 uppercase">{dia}</span>
                          <span className={`${agenda.status === 'Cancelado' ? 'line-through text-red-500' : 'text-gray-800'} text-lg font-bold`}>{hora}</span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                          <h4 className="font-semibold text-gray-800 text-sm truncate">{agenda.pacienteNome}</h4>
                          <span className="text-xs font-medium text-gray-500">
                            {agenda.tipoProfissional}: <span className="text-gray-700">{agenda.tipoConsulta}</span>
                          </span>
                        </div>

                        {emAberto && !isPaciente && (
                            <button title="Alterar horário" onClick={() => abrirAlteracao(agenda)} className="p-1.5 ml-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                        )}
                      </div>

                      {/* Bar de Controle de Status Máquina de Estados */}
                      <div className="bg-gray-50/80 border-t border-gray-100 px-4 py-2.5 flex items-center justify-between ml-1">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                           <div className={`w-2 h-2 rounded-full ${agenda.status === 'Agendado' ? 'bg-blue-400' : agenda.status === 'EmAtendimento' ? 'bg-amber-400' : agenda.status === 'Cancelado' ? 'bg-red-500' : !emAberto ? 'bg-gray-400' : 'bg-purple-400'}`}></div>
                           {MapNomesStatus[agenda.status] || agenda.status}
                        </span>
                        
                        {!isPaciente && (
                            <div className="flex gap-2 items-center">
                            {podeCancelar && (
                                <button 
                                onClick={() => setCancelarAlvo({ id: agenda.id, nome: agenda.pacienteNome })} 
                                className="text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                                >
                                CANCELAR
                                </button>
                            )}
                            
                            {opcoesValidas.length > 0 && (
                                <select 
                                className="text-xs border border-gray-300 rounded p-1 font-medium text-gray-700 bg-white"
                                value={agenda.status}
                                onChange={(e) => alterarStatus(agenda.id, e.target.value)}
                                >
                                <option value={agenda.status} disabled>Mudar Status</option>
                                {opcoesValidas.map(op => (
                                    <option key={op} value={op}>{MapNomesStatus[op]}</option>
                                ))}
                                </select>
                            )}
                            </div>
                        )}
                      </div>

                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal De Mensagem Genérica */}
      {modalMensagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
             <h3 className="text-lg font-bold text-amber-600 mb-2">Aviso do Sistema do Fluxo</h3>
             <p className="text-sm text-gray-700 mb-6 font-medium">{modalMensagem}</p>
             <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded" onClick={() => setModalMensagem(null)}>Certo</button>
          </div>
        </div>
      )}

      {/* Modal Cancelamento Destrutivo (Cancelado - Status) */}
      {cancelarAlvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center border-t-4 border-red-500">
            <h3 className="text-lg font-bold text-red-600 mb-2 mt-2">Cancelar Consulta</h3>
            <p className="text-sm text-gray-700 mb-6">
              Esta ação registrará o status como <strong>Cancelado</strong> para a consulta de <strong>{cancelarAlvo.nome}</strong>.
            </p>
            <div className="flex gap-2">
              <button disabled={cancelando} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 text-sm font-semibold rounded" onClick={() => setCancelarAlvo(null)}>Voltar</button>
              <button disabled={cancelando} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold rounded" onClick={confirmarCancelamento}>{cancelando ? '...' : 'Sim, Cancelar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alteração de Data/Hora */}
      {alterarAlvo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
         <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
           <h3 className="text-lg font-bold text-blue-600 mb-2">Reagendar</h3>
           <p className="text-sm text-gray-500 mb-4">{alterarAlvo.pacienteNome} - {alterarAlvo.tipoConsulta}</p>
           <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded mb-4" value={alterarData} min={obterMinDateTimeLocal()} onChange={(e) => setAlterarData(e.target.value)} />
           <div className="flex gap-2">
             <button disabled={alterando} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 font-medium text-sm rounded" onClick={() => { setAlterarAlvo(null); setAlterarData("");}}>Cancelar</button>
             <button disabled={alterando} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 font-medium text-sm rounded" onClick={confirmarAlteracaoHora}>Salvar</button>
           </div>
         </div>
       </div>
      )}
    </>
  );
}
