import type { AgendamentoHistoricoResponse } from "../pages/AgendamentoList";
import { MapNomesStatus } from "../constants/statusMap";
import { X, User } from 'lucide-react';
import { getRealDate } from '../utils/dates';
import { useScrollBlock } from "../hooks/useScrollBlock";
import ModalPortal from "./ui/ModalPortal";

interface ModalHistoricoProps {
  historico: AgendamentoHistoricoResponse[];
  loading: boolean;
  onFechar: () => void;
}

export default function ModalHistorico({ historico, loading, onFechar }: ModalHistoricoProps) {
  useScrollBlock(true);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-ink/45 p-0 sm:p-4 backdrop-blur-[2px] animate-in fade-in duration-300">
      {/* Largura total no mobile (sem margens), centralizado no tablet/desktop */}
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:rounded-lg sm:max-w-lg shadow-xl flex flex-col sm:max-h-[80vh] rounded-none sm:rounded-lg overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-line shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-ink">Histórico do Agendamento</h3>
          <button onClick={onFechar} className="text-muted hover:text-body p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Linha do tempo com scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="relative border-l-2 border-line ml-3 space-y-6 pb-4 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative pl-6 animate-pulse">
                  <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-line-soft border-2 border-white shadow"></span>
                  <div className="flex flex-col gap-2">
                    <div className="h-3 w-24 bg-line-soft rounded"></div>
                    <div className="h-5 w-32 bg-line-soft rounded"></div>
                    <div className="h-4 w-48 bg-line-soft rounded mt-1"></div>
                    <div className="h-3 w-32 bg-line-soft rounded mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-muted bg-canvas rounded">Nenhum evento registrado para este agendamento.</div>
          ) : (
            <div className="relative border-l-2 border-line ml-3 space-y-6 pb-4 mt-2">
              {historico.map((h) => (
                <div key={h.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-muted mb-0.5">
                      {getRealDate(h.dtCriado, true)!.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <h4 className="text-base font-bold text-ink">
                      {h.tipoEvento}
                    </h4>

                    {h.tipoEvento === "MudancaStatus" && (
                      <div className="text-base text-body mt-1">
                        Status: <span className="font-semibold text-body">{MapNomesStatus[h.statusAnterior || ""] || h.statusAnterior || "-"}</span> → <span className="font-semibold text-blue-600">{MapNomesStatus[h.statusNovo || ""] || h.statusNovo}</span>
                      </div>
                    )}

                    {h.tipoEvento === "Remarcacao" && (
                      <div className="text-base text-body mt-1">
                        Data: <span className="font-semibold text-body">{h.dataAnterior ? getRealDate(h.dataAnterior)!.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : "-"}</span> → <span className="font-semibold text-blue-600">{h.dataNova ? getRealDate(h.dataNova)!.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : "-"}</span>
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

                    <div className="text-xs text-muted mt-2 italic flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Realizado por: {h.nomeRealizadoPor}
                    </div>

                    {h.observacao && (
                      <div className="mt-2 text-base text-body bg-amber-50 p-3 rounded border border-amber-100">
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
        <div className="shrink-0 p-4 sm:p-6 pt-4 border-t border-line text-right">
          <button
            onClick={onFechar}
            className="bg-canvas hover:bg-line-soft text-body py-2 px-6 font-medium text-sm rounded transition-colors w-full sm:w-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
