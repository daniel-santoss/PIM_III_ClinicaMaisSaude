import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { obterMinDate, getRealDate } from "../utils/dates";
import { Calendar, Clock, AlertCircle, X } from 'lucide-react';
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
    const dataHoraUnida = `${alterarDataSomente}T${alterarHorarioSelecionado}:00`;
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
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-ink/45 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-300"
      onClick={e => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-w-md rounded-none sm:rounded-xl shadow-modal overflow-hidden border-0 sm:border border-line flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in duration-300 relative">

        {/* Botão Fechar X */}
        <button
          onClick={onFechar}
          className="absolute right-5 top-5 w-8 h-8 grid place-items-center text-body bg-canvas border border-line rounded-md hover:bg-line-soft transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1.5 bg-line rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-5 pt-3 sm:pt-6 border-b border-line shrink-0">
          <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wide mb-1.5">Reagendar consulta</p>
          <h3 className="text-xl font-semibold text-ink leading-tight">{agenda.pacienteNome}</h3>
          <span className="inline-block mt-2 text-xs font-medium text-body bg-line-soft px-2.5 py-1 rounded-md">
            {agenda.tipoConsulta}
          </span>
        </div>

        {/* Corpo com scroll */}
        <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-5 space-y-5">

          {/* Nova Data */}
          <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-body mb-1.5">
              <Calendar className="w-3.5 h-3.5" /> Nova Data
            </label>
            <input
              type="date"
              className="w-full h-10 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow cursor-pointer"
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
              <label className="flex items-center gap-2 text-[13px] font-medium text-body mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Horário{alterarHorarioSelecionado && <span className="text-purple-600 normal-case ml-1">— {alterarHorarioSelecionado}</span>}
              </label>
              {carregandoHorarios ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-canvas border border-line rounded-md">
                  <div className="w-4 h-4 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
                  <span className="text-[13px] font-medium text-body">Buscando horários...</span>
                </div>
              ) : horariosDisponiveis.length === 0 ? (
                <div className="flex items-center gap-2 px-3.5 py-3 text-[13px] font-medium text-danger bg-danger-tint border border-danger-border rounded-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Nenhum horário disponível para esta data e tipo de consulta.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {horariosDisponiveis.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAlterarHorarioSelecionado(h)}
                      className={`h-10 text-[13px] rounded-md border transition-colors ${
                        alterarHorarioSelecionado === h
                          ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                          : 'bg-white text-body border-line hover:bg-canvas font-medium'
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
              <label className="flex items-center gap-2 text-[13px] font-medium text-body mb-1.5">
                Observação <span className="text-danger font-medium text-xs">* obrigatório</span>
              </label>
              <textarea
                className={`w-full p-3 rounded-md text-sm text-ink bg-white border focus:border-brand-600 focus:shadow-focus transition-shadow outline-none resize-none placeholder:text-muted ${
                  !observacaoRemarcacao.trim() && focoObservacao ? 'border-danger-border' : 'border-line'
                }`}
                rows={3}
                placeholder="Descreva obrigatoriamente o motivo da remarcação..."
                value={observacaoRemarcacao}
                onChange={(e) => setObservacaoRemarcacao(e.target.value)}
                onFocus={() => setFocoObservacao(true)}
                onBlur={() => setFocoObservacao(false)}
              />
              {!observacaoRemarcacao.trim() && focoObservacao && (
                <p className="text-xs text-danger font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Campo obrigatório para auditoria.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="px-6 pb-6 pt-4 border-t border-line flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <button
            disabled={alterando}
            onClick={onFechar}
            className="w-full sm:w-auto h-10 px-4 text-sm font-semibold text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={alterando || !alterarDataSomente || !alterarHorarioSelecionado || !observacaoRemarcacao.trim()}
            onClick={confirmarAlteracaoHora}
            className="w-full sm:w-auto h-10 px-[18px] text-sm font-semibold text-white bg-brand-600 border border-brand-600 rounded-md hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
