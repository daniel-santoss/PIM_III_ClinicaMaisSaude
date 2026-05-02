import { useEffect, useState } from "react";
import { AlertCircle } from 'lucide-react';

function obterMinDate(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

interface ModalRemarcarProps {
  agenda: {
    id: string;
    pacienteNome: string;
    tipoConsulta: string;
    dataHoraConsulta: string;
  };
  onFechar: () => void;
  onSucesso: () => void;
  onMensagem: (msg: string) => void;
}

export default function ModalRemarcar({ agenda, onFechar, onSucesso, onMensagem }: ModalRemarcarProps) {
  const [alterarDataSomente, setAlterarDataSomente] = useState("");
  const [alterarHorarioSelecionado, setAlterarHorarioSelecionado] = useState("");
  const [observacaoRemarcacao, setObservacaoRemarcacao] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [alterando, setAlterando] = useState(false);
  const [focoObservacao, setFocoObservacao] = useState(false);

  useEffect(() => {
    const d = new Date(agenda.dataHoraConsulta);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    setAlterarDataSomente(`${ano}-${mes}-${dia}`);
  }, [agenda]);

  useEffect(() => {
    const fetchHorarios = async () => {
      if (!alterarDataSomente) {
        setHorariosDisponiveis([]);
        setAlterarHorarioSelecionado("");
        return;
      }
      setCarregandoHorarios(true);
      try {
        const token = localStorage.getItem("authToken");
        let tipoConsultaInt = 0;
        if (agenda.tipoConsulta === "Exame") tipoConsultaInt = 1;
        else if (agenda.tipoConsulta === "Vacina") tipoConsultaInt = 2;
        else if (agenda.tipoConsulta === "Consulta Médica" || agenda.tipoConsulta === "ConsultaMédica") tipoConsultaInt = 3;
        else if (agenda.tipoConsulta === "Retorno") tipoConsultaInt = 4;

        const res = await fetch(`http://localhost:5045/api/Agendamentos/horarios-disponiveis?data=${alterarDataSomente}&tipoConsulta=${tipoConsultaInt}`, {
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
  }, [alterarDataSomente, agenda.tipoConsulta]);

  const confirmarAlteracaoHora = async () => {
    if (!alterarDataSomente || !alterarHorarioSelecionado) return;
    const dataHoraUnida = `${alterarDataSomente}T${alterarHorarioSelecionado}:00`;
    setAlterando(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!observacaoRemarcacao.trim()) {
        onMensagem("A observação é obrigatória para registrar o motivo da remarcação.");
        setAlterando(false);
        return;
      }

      const dataOriginal = new Date(agenda.dataHoraConsulta).getTime();
      const dataNova = new Date(dataHoraUnida).getTime();

      if (dataOriginal === dataNova) {
        onMensagem("A nova data e hora devem ser diferentes do agendamento original.");
        setAlterando(false);
        return;
      }

      const response = await fetch(`http://localhost:5045/api/Agendamentos/${agenda.id}/remarcar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          novaDataHora: dataHoraUnida,
          observacao: observacaoRemarcacao.trim()
        })
      });

      if (!response.ok) {
        onMensagem(await response.text());
        return;
      }

      onSucesso();
    } catch (err) {
      onMensagem("Falha de conexão ao alterar agendamento.");
    } finally {
      setAlterando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-blue-600 mb-2">Reagendar</h3>
        <p className="text-sm text-gray-500 mb-4">{agenda.pacienteNome} - {agenda.tipoConsulta}</p>

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
                  onMensagem("Não é possível agendar consultas aos fins de semana.");
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
              {carregandoHorarios ? (
                <p className="text-sm text-blue-600 font-medium">Buscando horários...</p>
              ) : horariosDisponiveis.length === 0 ? (
                <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">Nenhum horário disponível para esta data e tipo de consulta.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {horariosDisponiveis.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAlterarHorarioSelecionado(h)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all ${alterarHorarioSelecionado === h
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-purple-100'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300'
                        }`}
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
                    <AlertCircle className="w-3 h-3" />
                    Campo obrigatório para auditoria.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button disabled={alterando} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 font-medium text-sm rounded" onClick={onFechar}>Cancelar</button>
          <button disabled={alterando || !alterarDataSomente || !alterarHorarioSelecionado || !observacaoRemarcacao.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 font-medium text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={confirmarAlteracaoHora}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
