import type { PacienteResponse } from "../types/PacienteResponse";
import { mascaraCpf } from "../utils/validators";
import { User, Clock, Calendar } from 'lucide-react';

const MapNomesStatus: Record<string, string> = {
  "Agendado": "Agendado",
  "EmAtendimento": "Em Atendimento",
  "AguardandoRetorno": "Aguardando Retorno",
  "RetornoAgendado": "Retorno Agendado",
  "Finalizado": "Finalizado",
  "Faltou": "Faltou",
  "Cancelado": "Cancelado"
};

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
  };
  opcoesValidas: string[];
  podeCancelar: boolean;
  podeRemarcar: boolean;
  onAlterarStatus: (id: string, novoStatus: string) => void;
  onCancelar: (id: string, nome: string) => void;
  onRemarcar: (agenda: any) => void;
  onHistorico: (id: string) => void;
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
}: AgendamentoCardProps) {
  const dataObj = new Date(agenda.dataHoraConsulta);
  const dia = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-purple-100/30 border-4 border-purple-400 overflow-hidden hover:scale-[1.02] transition-all duration-300 flex flex-col group">
      {/* Cabeçalho do Card: Horário e Status */}
      <div className="p-6 pb-4 flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-[#7C3AED] leading-none">{hora}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{dia}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${agenda.status === 'Finalizado' ? 'bg-green-50 text-green-600 border-green-100' :
          agenda.status === 'Faltou' ? 'bg-red-50 text-red-600 border-red-100' :
            agenda.status === 'Cancelado' ? 'bg-gray-50 text-gray-400 border-gray-100' :
              agenda.status === 'EmAtendimento' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-purple-50 text-purple-600 border-purple-100'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${agenda.status === 'EmAtendimento' ? 'animate-pulse' : ''} ${agenda.status === 'Finalizado' ? 'bg-green-500' :
            agenda.status === 'Faltou' ? 'bg-red-500' :
              agenda.status === 'EmAtendimento' ? 'bg-amber-500' :
                'bg-purple-500'
            }`}></span>
          {MapNomesStatus[agenda.status] || agenda.status}
        </span>
      </div>

      {/* Corpo do Card: Paciente e Profissional */}
      <div className="px-6 py-4 flex-1">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-100">
            {agenda.pacienteNome.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h4 className="text-sm font-black text-gray-800 leading-tight group-hover:text-[#7C3AED] transition-colors">{agenda.pacienteNome}</h4>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{agenda.tipoConsulta}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-2xl border border-purple-50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[#7C3AED] shadow-sm">
              <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-tight">{agenda.tipoProfissional}</span>
          </div>
          {opcoesValidas.length > 0 && (
            <select
              className="text-[9px] font-black uppercase tracking-tighter border border-purple-100 rounded-lg p-1 bg-white text-purple-600 focus:ring-2 focus:ring-purple-400 outline-none transition-all cursor-pointer"
              value={agenda.status}
              onChange={(e) => onAlterarStatus(agenda.id, e.target.value)}
            >
              <option value={agenda.status} disabled>Mudar Status</option>
              {opcoesValidas.map(op => (
                <option key={op} value={op}>{MapNomesStatus[op]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Rodapé: Ações */}
      <div className="px-6 py-4 border-t border-purple-50 flex items-center justify-between bg-purple-50/10">
        <div className="flex gap-1">
          <button title="Histórico" onClick={() => onHistorico(agenda.id)} className="p-2 text-gray-400 hover:bg-white hover:text-purple-600 rounded-xl transition-all shadow-sm hover:shadow-md"><Clock className="w-5 h-5" strokeWidth={2} /></button>
          {podeRemarcar && (
            <button title="Remarcar" onClick={() => onRemarcar(agenda)} className="p-2 text-purple-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"><Calendar className="w-5 h-5" strokeWidth={2} /></button>
          )}
        </div>

        {podeCancelar && (
          <button
            onClick={() => onCancelar(agenda.id, agenda.pacienteNome)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
