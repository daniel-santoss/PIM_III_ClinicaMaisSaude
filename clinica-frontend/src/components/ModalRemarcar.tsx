import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { obterMinDate, getRealDate } from "../utils/dates";
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";

interface ModalRemarcarProps {
  agenda: {
    id: string;
    pacienteNome: string;
    tipoConsulta: string;
    dataHoraConsulta: string;
  };
  onFechar: () => void;
  onSucesso: () => void;
}

export default function ModalRemarcar({ agenda, onFechar, onSucesso }: ModalRemarcarProps) {
  const toast = useToast();
  const [alterarDataSomente, setAlterarDataSomente] = useState("");
  const [alterarHorarioSelecionado, setAlterarHorarioSelecionado] = useState("");
  const [observacaoRemarcacao, setObservacaoRemarcacao] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [alterando, setAlterando] = useState(false);
  const [focoObservacao, setFocoObservacao] = useState(false);

  useScrollBlock(true);

  useEffect(() => {
    const d = getRealDate(agenda.dataHoraConsulta)!;
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

        const res = await fetch(`${API_URL}/api/Agendamentos/horarios-disponiveis?data=${alterarDataSomente}&tipoConsulta=${tipoConsultaInt}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setHorariosDisponiveis(await res.json());
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
    const dataHoraUnida = `${alterarDataSomente}T${alterarHorarioSelecionado}:00-03:00`;
    setAlterando(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!observacaoRemarcacao.trim()) {
        toast.warning("A observação é obrigatória para registrar o motivo da remarcação.");
        setAlterando(false);
        return;
      }

      const dataOriginal = getRealDate(agenda.dataHoraConsulta)!.getTime();
      const dataNova = new Date(dataHoraUnida).getTime();

      if (dataOriginal === dataNova) {
        toast.warning("A nova data e hora devem ser diferentes do agendamento original.");
        setAlterando(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/Agendamentos/${agenda.id}/remarcar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          novaDataHora: dataHoraUnida,
          observacao: observacaoRemarcacao.trim()
        })
      });

      if (!response.ok) {
        toast.error(await response.text());
        return;
      }

      onSucesso();
    } catch (err) {
      toast.error("Falha de conexão ao alterar agendamento.");
    } finally {
      setAlterando(false);
    }
  };

  return (
    /* Bottom-sheet no mobile, centralizado no desktop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300"
      onClick={e => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-w-md rounded-none sm:rounded-[2rem] shadow-2xl overflow-hidden border-0 sm:border border-purple-50 flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in duration-300">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-5 pt-3 sm:pt-6 sm:px-8 border-b border-gray-50 shrink-0">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Reagendar Consulta</p>
          <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">{agenda.pacienteNome}</h3>
          <span className="inline-block mt-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            {agenda.tipoConsulta}
          </span>
        </div>

        {/* Corpo com scroll */}
        <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-5 space-y-5">

          {/* Nova Data */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              <Calendar className="w-3.5 h-3.5" /> Nova Data
            </label>
            <input
              type="date"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-[#7C3AED] focus:bg-white transition-all outline-none font-bold text-sm"
              value={alterarDataSomente}
              min={obterMinDate()}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const dateObj = new Date(val + "T00:00:00");
                  if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
                    toast.warning("Não é possível agendar consultas aos fins de semana.");
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
          </div>

          {/* Horários */}
          {alterarDataSomente && (
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                <Clock className="w-3.5 h-3.5" /> Horário{alterarHorarioSelecionado && <span className="text-purple-600 normal-case ml-1">— {alterarHorarioSelecionado}</span>}
              </label>
              {carregandoHorarios ? (
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl">
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin" />
                  <span className="text-sm font-bold text-purple-500">Buscando horários...</span>
                </div>
              ) : horariosDisponiveis.length === 0 ? (
                <p className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100">
                  Nenhum horário disponível para esta data e tipo de consulta.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {horariosDisponiveis.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAlterarHorarioSelecionado(h)}
                      className={`py-3 text-xs font-black rounded-xl border transition-all ${
                        alterarHorarioSelecionado === h
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-purple-100'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Observação */}
          {alterarDataSomente && (
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Observação <span className="text-red-400 normal-case font-bold text-[10px]">* obrigatório</span>
              </label>
              <textarea
                className={`w-full p-4 border-2 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-purple-100 focus:border-[#7C3AED] transition-all outline-none resize-none bg-gray-50 focus:bg-white ${
                  !observacaoRemarcacao.trim() && focoObservacao ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
                }`}
                rows={3}
                placeholder="Descreva obrigatoriamente o motivo da remarcação..."
                value={observacaoRemarcacao}
                onChange={(e) => setObservacaoRemarcacao(e.target.value)}
                onFocus={() => setFocoObservacao(true)}
                onBlur={() => setFocoObservacao(false)}
              />
              {!observacaoRemarcacao.trim() && focoObservacao && (
                <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Campo obrigatório para auditoria.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="px-6 sm:px-8 pb-6 pt-4 border-t border-gray-50 flex flex-col-reverse sm:flex-row gap-3 shrink-0">
          <button
            disabled={alterando}
            onClick={onFechar}
            className="w-full sm:flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all text-center"
          >
            Cancelar
          </button>
          <button
            disabled={alterando || !alterarDataSomente || !alterarHorarioSelecionado || !observacaoRemarcacao.trim()}
            onClick={confirmarAlteracaoHora}
            className="w-full sm:flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100 hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {alterando ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : "Confirmar Remarcação"}
          </button>
        </div>
      </div>
    </div>
  );
}
