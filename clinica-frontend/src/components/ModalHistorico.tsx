import type { AgendamentoHistoricoResponse } from "./AgendamentoList";
import { MapNomesStatus } from "../constants/statusMap";
import { X, User } from 'lucide-react';
import { useScrollBlock } from "../hooks/useScrollBlock";

interface ModalHistoricoProps {
  historico: AgendamentoHistoricoResponse[];
  loading: boolean;
  onFechar: () => void;
}

export default function ModalHistorico({ historico, loading, onFechar }: ModalHistoricoProps) {
  useScrollBlock(true);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      {/* Largura total no mobile (sem margens), centralizado no tablet/desktop */}
      <div className="bg-white w-full sm:rounded-lg sm:max-w-lg shadow-xl flex flex-col max-h-[90vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-800">Histórico do Agendamento</h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Linha do tempo com scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando histórico...</div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">Nenhum evento registrado para este agendamento.</div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-4 mt-2">
              {historico.map((h) => (
                <div key={h.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-400 mb-0.5">
                      {new Date(h.dtCriado).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <h4 className="text-base font-bold text-gray-800">
                      {h.tipoEvento}
                    </h4>

                    {h.tipoEvento === "MudancaStatus" && (
                      <div className="text-base text-gray-600 mt-1">
                        Status: <span className="font-semibold text-gray-700">{MapNomesStatus[h.statusAnterior || ""] || h.statusAnterior || "-"}</span> → <span className="font-semibold text-blue-600">{MapNomesStatus[h.statusNovo || ""] || h.statusNovo}</span>
                      </div>
                    )}

                    {h.tipoEvento === "Remarcacao" && (
                      <div className="text-base text-gray-600 mt-1">
                        Data: <span className="font-semibold text-gray-700">{h.dataAnterior ? new Date(h.dataAnterior).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : "-"}</span> → <span className="font-semibold text-blue-600">{h.dataNova ? new Date(h.dataNova).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : "-"}</span>
                      </div>
                    )}

                    {h.tipoEvento === "Cancelamento" && (
                      <div className="text-base text-red-600 mt-1 font-medium">
                        Agendamento Cancelado
                      </div>
                    )}

                    {h.tipoEvento === "Criacao" && (
                      <div className="text-base text-green-600 mt-1 font-medium">
                        Consulta agendada no sistema
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-2 italic flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Realizado por: {h.nomeRealizadoPor}
                    </div>

                    {h.observacao && (
                      <div className="mt-2 text-base text-gray-700 bg-amber-50 p-3 rounded border border-amber-100">
                        <span className="font-semibold text-amber-700 block mb-1">Observação:</span> {h.observacao}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="shrink-0 p-4 sm:p-6 pt-4 border-t border-gray-100 text-right">
          <button
            onClick={onFechar}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-6 font-medium text-sm rounded transition-colors w-full sm:w-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
