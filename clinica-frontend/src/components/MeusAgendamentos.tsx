import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { MapNomesStatus } from "../constants/statusMap";
import { Plus, User, Calendar } from 'lucide-react';

interface AgendamentoItem {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  dataHoraConsulta: string;
  tipoConsulta: string;
  status: string;
  nomeProfissional: string;
  observacao?: string;
}

interface MeusAgendamentosProps {
  onNovoAgendamento: () => void;
}

export default function MeusAgendamentos({ onNovoAgendamento }: MeusAgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const pacienteId = localStorage.getItem("pacienteId");
  const token = localStorage.getItem("authToken");

  const carregarAgendamentos = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/Agendamentos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        setAgendamentos(dados.sort((a: any, b: any) => new Date(b.dataHoraConsulta).getTime() - new Date(a.dataHoraConsulta).getTime()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAgendamentos();
  }, [pacienteId, token]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Agendado": return "bg-purple-50 text-purple-600 border-purple-100";
      case "EmAtendimento": return "bg-amber-50 text-amber-600 border-amber-100";
      case "AguardandoRetorno": return "bg-sky-50 text-sky-600 border-sky-100";
      case "RetornoAgendado": return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "Finalizado": return "bg-green-50 text-green-600 border-green-100";
      case "Faltou": return "bg-orange-50 text-orange-600 border-orange-100";
      case "Cancelado": return "bg-red-50 text-red-600 border-red-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meus Agendamentos</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Histórico e consultas marcadas</p>
        </div>
        <button
          onClick={onNovoAgendamento}
          className="px-6 py-3 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-100 hover:scale-105 transition-all flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Novo Agendamento
        </button>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Carregando suas consultas...</p>
        </div>
      ) : agendamentos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agendamentos.map(a => (
            <div key={a.id} className="bg-white rounded-[2rem] shadow-xl shadow-purple-100/30 border-4 border-purple-400 overflow-hidden hover:scale-[1.02] transition-all duration-300 flex flex-col group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(a.status)}`}>
                  {MapNomesStatus[a.status] || a.status}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data e Hora</p>
                  <p className="text-sm font-black text-gray-800">
                    {new Date(a.dataHoraConsulta).toLocaleDateString('pt-BR')} às {new Date(a.dataHoraConsulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-all">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Profissional</p>
                    <p className="text-md font-black text-gray-800">{a.nomeProfissional}</p>
                    <p className="text-xs font-bold text-purple-600">{a.tipoConsulta}</p>
                  </div>
                </div>
                
                {a.observacao && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Sintomas/Notas</p>
                    <p className="text-xs font-medium text-gray-500 italic">"{a.observacao}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-gray-400 text-sm font-medium mb-8">Você ainda não possui consultas marcadas no sistema.</p>
          <button onClick={onNovoAgendamento} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Marcar Primeira Consulta</button>
        </div>
      )}
    </div>
  );
}
