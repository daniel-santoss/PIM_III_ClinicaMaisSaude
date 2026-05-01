import type { AgendamentoHistoricoResponse } from "./AgendamentoList";

const MapNomesStatus: Record<string, string> = {
  "Agendado": "Agendado",
  "EmAtendimento": "Em Atendimento",
  "AguardandoRetorno": "Aguardando Retorno",
  "RetornoAgendado": "Retorno Agendado",
  "Finalizado": "Finalizado",
  "Faltou": "Faltou",
  "Cancelado": "Cancelado"
};

interface ModalHistoricoProps {
  historico: AgendamentoHistoricoResponse[];
  loading: boolean;
  onFechar: () => void;
}

export default function ModalHistorico({ historico, loading, onFechar }: ModalHistoricoProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Histórico do Agendamento</h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando histórico...</div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">Nenhum evento registrado para este agendamento.</div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-4 mt-2">
              {historico.map((h) => (
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
          <button onClick={onFechar} className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-6 font-medium text-sm rounded transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  );
}
