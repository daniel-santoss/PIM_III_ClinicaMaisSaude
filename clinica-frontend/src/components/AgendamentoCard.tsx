
import { useEffect, useRef } from 'react';
import { MapNomesStatus, MapNomesTipoConsulta, MapNomesEspecialidade } from "../constants/statusMap";
import { Clock, Calendar, Stethoscope } from 'lucide-react';

interface AgendamentoCardProps {
  agenda: {
    id: string;
    pacienteId: string;
    pacienteNome: string;
    dataHoraConsulta: string;
    tipoProfissional: string;
    tipoConsulta: string;
    status: string;
    nomeProfissional: string;
    especialidade?: string;
    nivelProbabilidadeFalta?: string;
    probabilidadeFalta?: number;
  };
  highlighted?: boolean;
  opcoesValidas: string[];
  podeCancelar: boolean;
  podeRemarcar: boolean;
  tipoUsuarioLogado: string | null;
  onAlterarStatus?: (id: string, novoStatus: string) => void;
  onCancelar?: (id: string, nome: string) => void;
  onRemarcar?: (agenda: any) => void;
  onHistorico?: (id: string) => void;
}

export default function AgendamentoCard({
  agenda,
  opcoesValidas,
  podeCancelar,
  podeRemarcar,
  onAlterarStatus,
  onCancelar,
  onRemarcar,
  onHistorico,
  tipoUsuarioLogado,
  highlighted = false,
}: AgendamentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      // Pequeno delay para garantir que a aba já está renderizada
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlighted]);
  const dataObj = new Date(agenda.dataHoraConsulta);
  const dia = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const duasHorasAtras = new Date();
  duasHorasAtras.setHours(duasHorasAtras.getHours() - 2);
  const isPendenteAtualizacao = dataObj < duasHorasAtras && (agenda.status === 'Agendado' || agenda.status === 'EmAtendimento');

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-2xl shadow-sm border flex flex-col h-full transition-all duration-500 ${
        highlighted
          ? 'border-purple-400 shadow-lg shadow-purple-200/60 ring-2 ring-purple-300 card-highlight'
          : 'border-gray-200'
      }`}
    >
      {/* Cabeçalho do Card: Horário e Status */}
      <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-2xl sm:text-3xl font-bold text-[#7C3AED] leading-none">{hora}</span>
          <span className="text-xs font-medium text-gray-500 uppercase mt-2 tracking-wide">{dia}</span>
        </div>
        
        {/* Status Badges */}
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${
              agenda.status === 'Agendado' ? 'bg-[#3B82F6]' :
              agenda.status === 'EmAtendimento' ? 'bg-[#F59E0B]' :
              agenda.status === 'AguardandoRetorno' ? 'bg-[#F97316]' :
              agenda.status === 'RetornoAgendado' ? 'bg-[#7C3AED]' :
              agenda.status === 'Finalizado' ? 'bg-[#10B981]' :
              agenda.status === 'Cancelado' ? 'bg-[#6B7280]' :
              agenda.status === 'Faltou' ? 'bg-[#EF4444]' :
              'bg-[#7C3AED]'
            }`}>
            {MapNomesStatus[agenda.status] || agenda.status}
          </span>
          {isPendenteAtualizacao && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
              Pendente de atualização
            </span>
          )}
        </div>
      </div>

      {/* Corpo do Card: Paciente e Profissional */}
      <div className="px-4 sm:px-6 py-4 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xl shrink-0">
            {agenda.pacienteNome.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-tight line-clamp-1">{agenda.pacienteNome}</h4>
              {(tipoUsuarioLogado === "Medico" || tipoUsuarioLogado === "Enfermeira") && agenda.nivelProbabilidadeFalta && (agenda.status === "Agendado" || agenda.status === "RetornoAgendado") && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  agenda.nivelProbabilidadeFalta === "Alta" ? "bg-red-100 text-red-700" :
                  agenda.nivelProbabilidadeFalta === "Média" ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    agenda.nivelProbabilidadeFalta === "Alta" ? "bg-red-500" :
                    agenda.nivelProbabilidadeFalta === "Média" ? "bg-amber-500" :
                    "bg-green-500"
                  }`}></span>
                  Risco {agenda.nivelProbabilidadeFalta} {agenda.probabilidadeFalta !== undefined ? `(${agenda.probabilidadeFalta}%)` : ''}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
              {MapNomesTipoConsulta[agenda.tipoConsulta] || agenda.tipoConsulta}
              {agenda.tipoConsulta === "ConsultaMedica" && agenda.especialidade ? ` - ${MapNomesEspecialidade[agenda.especialidade] || agenda.especialidade}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Separador e Profissional */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#7C3AED] shrink-0">
          <Stethoscope className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-800">{agenda.nomeProfissional}</span>
          <span className="text-xs font-semibold text-gray-500">{agenda.tipoProfissional === 'Medico' ? 'Médico' : agenda.tipoProfissional}</span>
        </div>
      </div>

      {/* Rodapé: Ações */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {opcoesValidas.length > 0 && onAlterarStatus && (
          <div className="relative w-full sm:w-auto sm:order-last">
            <select
              className="w-full sm:w-auto appearance-none bg-white text-[#7C3AED] border border-[#7C3AED] text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl cursor-pointer outline-none hover:bg-[#F5F3FF] transition-colors"
              value={agenda.status}
              onChange={(e) => onAlterarStatus(agenda.id, e.target.value)}
            >
              <option value={agenda.status} disabled>Status</option>
              {opcoesValidas.map(op => (
                <option key={op} value={op}>{MapNomesStatus[op]}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[#7C3AED]">
              <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            {onHistorico && (
              <button
                title="Histórico"
                onClick={() => onHistorico(agenda.id)}
                className="flex items-center justify-center w-10 h-10 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}
            {podeRemarcar && onRemarcar && (
              <button
                title="Remarcar"
                onClick={() => onRemarcar(agenda)}
                className="flex items-center justify-center w-10 h-10 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}
          </div>

          {podeCancelar && onCancelar && (
            <button
              onClick={() => onCancelar(agenda.id, agenda.pacienteNome)}
              className="flex-1 sm:flex-none text-xs font-bold bg-red-500 text-white px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors shadow-sm whitespace-nowrap text-center h-10"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
