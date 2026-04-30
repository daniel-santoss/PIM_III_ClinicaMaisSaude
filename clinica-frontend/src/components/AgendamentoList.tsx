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
  nomeProfissional: string;
  dtCriado: string;
}

export interface AgendamentoHistoricoResponse {
  id: string;
  agendamentoId: string;
  tipoEvento: string;
  statusAnterior?: string;
  statusNovo?: string;
  dataAnterior?: string;
  dataNova?: string;
  observacao?: string;
  realizadoPor: string;
  nomeRealizadoPor: string;
  dtCriado: string;
}

export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

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

function obterMinDate(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  
  const [tipoProfissional, setTipoProfissional] = useState(0);
  const [tipoConsulta, setTipoConsulta] = useState(0);
  const [origemId, setOrigemId] = useState("");

  // Modais
  const [modalMensagem, setModalMensagem] = useState<string | null>(null);
  const [cancelarAlvo, setCancelarAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [alterarAlvo, setAlterarAlvo] = useState<AgendamentoResponse | null>(null);
  const [alterando, setAlterando] = useState(false);
  const [alterarDataSomente, setAlterarDataSomente] = useState("");
  const [alterarHorarioSelecionado, setAlterarHorarioSelecionado] = useState("");
  const [observacaoRemarcacao, setObservacaoRemarcacao] = useState("");
  const [horariosDisponiveisAlteracao, setHorariosDisponiveisAlteracao] = useState<string[]>([]);
  const [carregandoHorariosAlteracao, setCarregandoHorariosAlteracao] = useState(false);

  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const [filtroAgenda, setFiltroAgenda] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [ordemData, setOrdemData] = useState<"asc" | "desc">("desc");
  const [focoObservacao, setFocoObservacao] = useState(false);

  // Histórico
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [historicoAtual, setHistoricoAtual] = useState<AgendamentoHistoricoResponse[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [refreshContador]);

  useEffect(() => {
    if (isPaciente && pacientes.length > 0) {
      setPacienteSelecionado(pacientes[0].id);
    }
  }, [isPaciente, pacientes]);

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
  }, [dataSelecionada, tipoConsulta, refreshContador]);

  useEffect(() => {
    const fetchHorariosAlteracao = async () => {
      if (!alterarAlvo || !alterarDataSomente) {
        setHorariosDisponiveisAlteracao([]);
        setAlterarHorarioSelecionado("");
        return;
      }
      setCarregandoHorariosAlteracao(true);
      try {
        const token = localStorage.getItem("authToken");
        let tipoConsultaInt = 0;
        if (alterarAlvo.tipoConsulta === "Exame") tipoConsultaInt = 1;
        else if (alterarAlvo.tipoConsulta === "Vacina") tipoConsultaInt = 2;
        else if (alterarAlvo.tipoConsulta === "Consulta Médica" || alterarAlvo.tipoConsulta === "ConsultaMédica") tipoConsultaInt = 3;
        else if (alterarAlvo.tipoConsulta === "Retorno") tipoConsultaInt = 4;

        const res = await fetch(`http://localhost:5045/api/Agendamentos/horarios-disponiveis?data=${alterarDataSomente}&tipoConsulta=${tipoConsultaInt}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setHorariosDisponiveisAlteracao(await res.json());
        }
      } catch (e) {
        console.error("Erro ao carregar horários", e);
      } finally {
        setCarregandoHorariosAlteracao(false);
      }
    };
    fetchHorariosAlteracao();
  }, [alterarDataSomente, alterarAlvo]);

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
    if (!pacienteSelecionado || !dataSelecionada || !horarioSelecionado) {
      setModalMensagem("Por favor, preencha todos os campos e selecione um horário.");
      return;
    }

    if (tipoConsulta === 4 && !origemId) {
      setModalMensagem("Para agendar retorno, você precisa selecionar a consulta de origem.");
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
        setModalMensagem(await response.text());
        return;
      }

      setPacienteSelecionado("");
      setDataSelecionada("");
      setHorarioSelecionado("");
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
    if (!alterarAlvo || !alterarDataSomente || !alterarHorarioSelecionado) return;
    const dataHoraUnida = `${alterarDataSomente}T${alterarHorarioSelecionado}:00`;
    setAlterando(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!observacaoRemarcacao.trim()) {
        setModalMensagem("A observação é obrigatória para registrar o motivo da remarcação.");
        return;
      }

      // Validação: Não permitir remarcar para o mesmo dia e hora original
      const dataOriginal = new Date(alterarAlvo.dataHoraConsulta).getTime();
      const dataNova = new Date(dataHoraUnida).getTime();

      if (dataOriginal === dataNova) {
        setModalMensagem("A nova data e hora devem ser diferentes do agendamento original.");
        setAlterando(false);
        return;
      }

      const response = await fetch(`http://localhost:5045/api/Agendamentos/${alterarAlvo.id}/remarcar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          novaDataHora: dataHoraUnida,
          observacao: observacaoRemarcacao.trim()
        })
      });

      if (!response.ok) {
        setModalMensagem(await response.text());
        return;
      }

      setAlterarAlvo(null);
      setAlterarDataSomente("");
      setAlterarHorarioSelecionado("");
      setObservacaoRemarcacao("");
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
    setAlterarDataSomente(`${ano}-${mes}-${dia}`);
    setAlterarHorarioSelecionado(""); // Força o usuário a escolher um novo horário
    setObservacaoRemarcacao("");
  };

  const abrirHistorico = async (agendamentoId: string) => {
    setHistoricoLoading(true);
    setModalHistoricoAberto(true);
    setHistoricoAtual([]);
    try {
      const token = localStorage.getItem("authToken");
      const resp = await fetch(`http://localhost:5045/api/Agendamentos/${agendamentoId}/historico`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (resp.ok) {
        const dados = await resp.json();
        setHistoricoAtual(dados);
      } else {
        setModalMensagem(await resp.text());
        setModalHistoricoAberto(false);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico", error);
      setModalMensagem("Falha de conexão ao buscar histórico.");
      setModalHistoricoAberto(false);
    } finally {
      setHistoricoLoading(false);
    }
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

  const pacientesFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) || p.cpf.includes(buscaPaciente));

  const agendamentosFiltrados = agendamentos
    .filter(a => {
      const paciente = pacientes.find(p => p.id === a.pacienteId);
      const cpf = paciente ? paciente.cpf : "";
      
      const matchBusca = a.pacienteNome.toLowerCase().includes(filtroAgenda.toLowerCase()) || cpf.includes(filtroAgenda);
      const matchStatus = filtroStatus === "Todos" || a.status === filtroStatus;
      
      return matchBusca && matchStatus;
    })
    .sort((a, b) => {
      const dataA = new Date(a.dtCriado).getTime();
      const dataB = new Date(b.dtCriado).getTime();
      return ordemData === "desc" ? dataB - dataA : dataA - dataB;
    });

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
            {!isPaciente && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  className="w-full p-2.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  value={buscaPaciente}
                  onChange={(e) => {
                    setBuscaPaciente(e.target.value);
                    setMostrarListaPacientes(true);
                    setPacienteSelecionado(""); 
                    setOrigemId("");
                  }}
                  onFocus={() => setMostrarListaPacientes(true)}
                  onBlur={() => setTimeout(() => setMostrarListaPacientes(false), 200)}
                />
                {mostrarListaPacientes && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded shadow-lg">
                    {pacientesFiltrados.length === 0 ? (
                      <li className="p-2 text-sm text-gray-500">Nenhum paciente encontrado.</li>
                    ) : (
                      pacientesFiltrados.map((p) => (
                        <li
                          key={p.id}
                          className="p-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setPacienteSelecionado(p.id);
                            setBuscaPaciente(p.nome);
                            setMostrarListaPacientes(false);
                            setOrigemId("");
                          }}
                        >
                          <div className="font-semibold text-gray-800">{p.nome}</div>
                          <div className="text-xs text-gray-500">CPF: {p.cpf}</div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Consulta</label>
              <input
                type="date"
                className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all"
                value={dataSelecionada}
                min={obterMinDate()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setDataSelecionada("");
                    return;
                  }
                  const dateObj = new Date(val + "T00:00:00");
                  if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
                    setModalMensagem("Não é possível agendar consultas aos fins de semana.");
                    setDataSelecionada("");
                  } else {
                    setDataSelecionada(val);
                    setHorarioSelecionado("");
                  }
                }}
              />
            </div>

            {dataSelecionada && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horários Disponíveis</label>
                {carregandoHorarios ? (
                    <p className="text-sm text-blue-600 font-medium">Buscando horários...</p>
                ) : horariosDisponiveis.length === 0 ? (
                    <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">Nenhum horário disponível para esta data e tipo de consulta.</p>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {horariosDisponiveis.map(h => (
                            <button
                                key={h}
                                onClick={() => setHorarioSelecionado(h)}
                                className={`py-2 text-sm font-semibold rounded border transition-all ${horarioSelecionado === h ? 'bg-green-600 text-white border-green-700 shadow-md transform scale-105' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}
                            >
                                {h}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            )}

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Status da Agenda
            </h3>
            <div className="flex flex-row items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {/* 1. Filtro por nome ou CPF */}
              <div className="relative flex-grow sm:flex-none sm:w-64 min-w-[150px]">
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input
                  type="text"
                  placeholder="Nome ou CPF..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  value={filtroAgenda}
                  onChange={(e) => setFiltroAgenda(e.target.value)}
                />
              </div>

              {/* 2. Filtro de Status */}
              <div className="flex-shrink-0">
                <select
                  className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white min-w-[120px] sm:min-w-[140px]"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="Todos">Status</option>
                  {Object.keys(MapNomesStatus).map(s => (
                    <option key={s} value={s}>{MapNomesStatus[s]}</option>
                  ))}
                </select>
              </div>

              {/* 3. Ordenação por Data */}
              <button
                onClick={() => setOrdemData(prev => prev === "asc" ? "desc" : "asc")}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                title={ordemData === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
              >
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${ordemData === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
                </svg>
                <span className="font-semibold">{ordemData === "desc" ? "Recentes" : "Antigos"}</span>
              </button>
            </div>
          </div>

          {agendamentosFiltrados.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center border text-gray-500 border-dashed border-gray-300">
              Nenhum agendamento encontrado no sistema.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agendamentosFiltrados
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
                            {agenda.nomeProfissional && agenda.nomeProfissional !== "N/A" && (
                              <span className="text-blue-500 font-semibold ml-1"> — {agenda.nomeProfissional}</span>
                            )}
                          </span>
                        </div>

                        {emAberto && !isPaciente && (
                            <button title="Remarcar Consulta" onClick={() => abrirAlteracao(agenda)} className="p-1.5 ml-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </button>
                        )}
                        {!isPaciente && (
                            <button title="Ver Histórico" onClick={() => abrirHistorico(agenda.id)} className="p-1.5 ml-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full flex-shrink-0">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
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
           
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-1">Nova Data</label>
             <input 
               type="date" 
               className="w-full p-2 border border-gray-300 rounded mb-3" 
               value={alterarDataSomente} 
               min={obterMinDate()} 
               onChange={(e) => {
                 const val = e.target.value;
                 if (val) {
                   const dateObj = new Date(val + "T00:00:00");
                   if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
                     setModalMensagem("Não é possível agendar consultas aos fins de semana.");
                     setAlterarDataSomente("");
                   } else {
                     setAlterarDataSomente(val);
                     setAlterarHorarioSelecionado("");
                   }
                 } else {
                   setAlterarDataSomente("");
                 }
               }} 
             />

             {alterarDataSomente && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horários Disponíveis</label>
                  {carregandoHorariosAlteracao ? (
                      <p className="text-sm text-blue-600 font-medium">Buscando horários...</p>
                  ) : horariosDisponiveisAlteracao.length === 0 ? (
                      <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">Nenhum horário disponível para esta data e tipo de consulta.</p>
                  ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
                          {horariosDisponiveisAlteracao.map(h => (
                              <button
                                  key={h}
                                  onClick={() => setAlterarHorarioSelecionado(h)}
                                  className={`py-1.5 text-xs font-semibold rounded border transition-all ${alterarHorarioSelecionado === h ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}
                              >
                                  {h}
                              </button>
                          ))}
                      </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observação (Motivo da Remarcação) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className={`w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 transition-colors ${!observacaoRemarcacao.trim() && focoObservacao ? 'border-red-300 bg-red-50/30' : 'border-gray-300'}`}
                      rows={2}
                      placeholder="Descreva obrigatoriamente o motivo..."
                      value={observacaoRemarcacao}
                      onChange={(e) => setObservacaoRemarcacao(e.target.value)}
                      onFocus={() => setFocoObservacao(true)}
                      onBlur={() => setFocoObservacao(false)}
                    ></textarea>
                    {!observacaoRemarcacao.trim() && focoObservacao && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                        Campo obrigatório para auditoria.
                      </p>
                    )}
                  </div>
                </div>
             )}
           </div>

           <div className="flex gap-2 mt-4">
             <button disabled={alterando} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 font-medium text-sm rounded" onClick={() => { setAlterarAlvo(null); setAlterarDataSomente(""); setAlterarHorarioSelecionado("");}}>Cancelar</button>
             <button disabled={alterando || !alterarDataSomente || !alterarHorarioSelecionado || !observacaoRemarcacao.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 font-medium text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={confirmarAlteracaoHora}>Salvar</button>
           </div>
         </div>
       </div>
      )}
      {/* Modal Historico */}
      {modalHistoricoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Histórico do Agendamento</h3>
              <button onClick={() => setModalHistoricoAberto(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {historicoLoading ? (
                <div className="text-center py-8 text-gray-500">Carregando histórico...</div>
              ) : historicoAtual.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">Nenhum evento registrado para este agendamento.</div>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-4 mt-2">
                  {historicoAtual.map((h, index) => (
                    <div key={h.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 mb-0.5">
                          {new Date(h.dtCriado).toLocaleString('pt-BR')}
                        </span>
                        <h4 className="text-sm font-bold text-gray-800">
                          {h.tipoEvento}
                        </h4>
                        
                        {h.tipoEvento === "MudancaStatus" && (
                          <div className="text-sm text-gray-600 mt-1">
                            Status: <span className="font-semibold text-gray-700">{MapNomesStatus[h.statusAnterior || ""] || h.statusAnterior || "-"}</span> → <span className="font-semibold text-blue-600">{MapNomesStatus[h.statusNovo || ""] || h.statusNovo}</span>
                          </div>
                        )}

                        {h.tipoEvento === "Remarcacao" && (
                          <div className="text-sm text-gray-600 mt-1">
                            Data: <span className="font-semibold text-gray-700">{h.dataAnterior ? new Date(h.dataAnterior).toLocaleString('pt-BR') : "-"}</span> → <span className="font-semibold text-blue-600">{h.dataNova ? new Date(h.dataNova).toLocaleString('pt-BR') : "-"}</span>
                          </div>
                        )}

                        {h.tipoEvento === "Cancelamento" && (
                          <div className="text-sm text-red-600 mt-1 font-medium">
                            Agendamento Cancelado
                          </div>
                        )}

                        {h.tipoEvento === "Criacao" && (
                          <div className="text-sm text-green-600 mt-1 font-medium">
                            Consulta agendada no sistema
                          </div>
                        )}

                        <div className="text-[10px] text-gray-400 mt-2 italic flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                           Realizado por: {h.nomeRealizadoPor}
                        </div>

                        {h.observacao && (
                          <div className="mt-2 text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">
                            <span className="font-semibold text-amber-700 block mb-1">Observação:</span> {h.observacao}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-right">
              <button onClick={() => setModalHistoricoAberto(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-6 font-medium text-sm rounded transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
