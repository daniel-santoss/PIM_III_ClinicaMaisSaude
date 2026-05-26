import { useEffect } from 'react';
import { Clock, Calendar, CalendarPlus, Stethoscope } from 'lucide-react';
import { getRealDate } from "../utils/dates";
import { MapNomesStatus, MapNomesTipoConsulta, MapNomesEspecialidade } from "../constants/statusMap";
import { perfis } from "../constants/perfis";
import { statusAgendamento } from "../constants/status";

export interface AgendamentoVisualizadorItem {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  medicoId?: string;
  dataHoraConsulta: string;
  tipoProfissional: string;
  tipoConsulta: string;
  status: string;
  agendamentoOrigemId?: string;
  nomeProfissional: string;
  dtCriado: string;
  especialidade?: string;
  nivelProbabilidadeFalta?: string;
  probabilidadeFalta?: number;
  exigeResultadoPosterior?: boolean;
  resultadoDisponivel?: boolean;
  resultadoRetirado?: boolean;
  pacienteFotoBase64?: string;
  profissionalFotoBase64?: string;
}

interface AgendamentoVisualizadorProps {
  agendamentos: AgendamentoVisualizadorItem[];
  modoExibicao: "tabela" | "agenda";
  ordemData: "asc" | "desc";
  tipoUsuario: string | null;
  isAdmin?: boolean;
  agendamentoDestaque?: string | null;
  onAlterarStatus?: (id: string, novoStatus: string) => void;
  onCancelar?: (id: string, nome: string) => void;
  onRemarcar?: (agenda: any) => void;
  onHistorico?: (id: string) => void;
  onConcluirExame?: (agenda: any) => void;
  onAgendarRetorno?: (agenda: any) => void;
  onMarcarResultadoDisponivel?: (id: string) => void;
  onMarcarResultadoRetirado?: (id: string) => void;
}

export default function AgendamentoVisualizador({
  agendamentos,
  modoExibicao,
  ordemData,
  tipoUsuario,
  isAdmin,
  agendamentoDestaque,
  onAlterarStatus,
  onCancelar,
  onRemarcar,
  onHistorico,
  onConcluirExame,
  onAgendarRetorno,
  onMarcarResultadoDisponivel,
  onMarcarResultadoRetirado,
}: AgendamentoVisualizadorProps) {

  useEffect(() => {
    if (agendamentoDestaque) {
      const timer = setTimeout(() => {
        const elemento = document.getElementById(`agendamento-${agendamentoDestaque}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [agendamentoDestaque]);

  // Lógica de agrupamento por dia
  const agendamentosAgrupados = (() => {
    const grupos: Record<string, AgendamentoVisualizadorItem[]> = {};
    agendamentos.forEach(a => {
      const dataObj = getRealDate(a.dataHoraConsulta);
      if (dataObj) {
        const ano = dataObj.getFullYear();
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const chave = `${ano}-${mes}-${dia}`;
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(a);
      }
    });

    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
      return ordemData === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    return chavesOrdenadas.map(chave => ({
      dataChave: chave,
      itens: grupos[chave]
    }));
  })();

  const formatarHeaderData = (dataChave: string) => {
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;

    const partes = dataChave.split('-');
    const dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    
    const diaMes = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const diaSemanaFormatado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    if (dataChave === hojeStr) {
      return `Hoje — ${diaMes} (${diaSemanaFormatado})`;
    }
    if (dataChave === amanhaStr) {
      return `Amanhã — ${diaMes} (${diaSemanaFormatado})`;
    }
    return `${diaMes} — ${diaSemanaFormatado}`;
  };

  const obterOpcoesPermitidas = (statusAtual: string, tipoConsulta: string, dataHoraConsulta: string): string[] => {
    if (tipoUsuario === perfis.paciente) return [];

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const dataConsultaObj = getRealDate(dataHoraConsulta);
    const dataConsultaStr = dataConsultaObj 
      ? `${dataConsultaObj.getFullYear()}-${String(dataConsultaObj.getMonth() + 1).padStart(2, '0')}-${String(dataConsultaObj.getDate()).padStart(2, '0')}`
      : "";
    const ehHojeOuPassado = dataConsultaStr <= hojeStr;

    switch (statusAtual) {
      case statusAgendamento.agendado: 
        return ehHojeOuPassado ? [statusAgendamento.emAtendimento, statusAgendamento.faltou] : [];
      case statusAgendamento.emAtendimento:
        if (tipoConsulta === "ConsultaMédica" || tipoConsulta === "Consulta Médica" || tipoConsulta === "ConsultaMedica")
          return [statusAgendamento.aguardandoRetorno, statusAgendamento.finalizado];
        if (tipoConsulta === "Exame")
          return [];
        return [statusAgendamento.finalizado];
      case statusAgendamento.aguardandoRetorno: return [];
      case statusAgendamento.retornoAgendado: 
        return ehHojeOuPassado ? [statusAgendamento.finalizado, statusAgendamento.faltou] : [];
      default: return [];
    }
  };

  if (agendamentos.length === 0) {
    return (
      <div className="py-20 bg-white rounded-[2.5rem] border border-dashed border-purple-200 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum agendamento para exibir</p>
      </div>
    );
  }

  if (modoExibicao === "tabela") {
    return (
      <div className="space-y-10">
        {agendamentosAgrupados.map((grupo) => (
          <div key={grupo.dataChave} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Header de Data */}
            <div className="flex items-center justify-between pt-2 pb-1 border-b border-purple-100/50">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider bg-purple-50 text-[#7C3AED] px-3.5 py-1.5 rounded-xl border border-purple-100/60 shadow-sm">
                  {formatarHeaderData(grupo.dataChave)}
                </h3>
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
                {grupo.itens.length} {grupo.itens.length === 1 ? "atendimento" : "atendimentos"}
              </span>
            </div>

            {/* Tabela compacta */}
            <div className="overflow-x-auto bg-white rounded-3xl border border-gray-100/80 shadow-xl shadow-purple-100/5">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-purple-50/40 border-b border-purple-100/40">
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">Horário</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">
                      {tipoUsuario === perfis.paciente ? "Profissional" : "Paciente"}
                    </th>
                    {(tipoUsuario !== perfis.paciente && tipoUsuario !== perfis.medico || isAdmin) && (
                      <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">Profissional</th>
                    )}
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">Tipo / Especialidade</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">Status</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grupo.itens.map((agenda) => {
                    const dataObj = getRealDate(agenda.dataHoraConsulta)!;
                    const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const opcoesValidas = obterOpcoesPermitidas(agenda.status, agenda.tipoConsulta, agenda.dataHoraConsulta);
                    const podeCancelar = agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.retornoAgendado;
                    const podeRemarcar = agenda.status !== statusAgendamento.finalizado && agenda.status !== statusAgendamento.cancelado;
                    
                    const duasHorasAtras = new Date();
                    duasHorasAtras.setHours(duasHorasAtras.getHours() - 2);
                    const isPendenteAtualizacao = dataObj < duasHorasAtras && (agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.emAtendimento);
                    
                    return (
                      <tr id={`agendamento-${agenda.id}`} key={agenda.id} className={`hover:bg-purple-50/10 transition-colors group ${agenda.id === agendamentoDestaque ? "bg-purple-50/40 font-semibold" : ""}`}>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            <span className="text-base font-black text-gray-800">{hora}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-base overflow-hidden shadow-sm shrink-0 animate-in fade-in zoom-in duration-200">
                              {tipoUsuario === perfis.paciente ? (
                                agenda.profissionalFotoBase64 ? (
                                  <img src={agenda.profissionalFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  agenda.nomeProfissional.charAt(0).toUpperCase()
                                )
                              ) : (
                                agenda.pacienteFotoBase64 ? (
                                  <img src={agenda.pacienteFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  agenda.pacienteNome.charAt(0).toUpperCase()
                                )
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-bold text-gray-900 group-hover:text-[#7C3AED] transition-colors leading-snug">
                                {tipoUsuario === perfis.paciente ? agenda.nomeProfissional : agenda.pacienteNome}
                              </span>
                              {tipoUsuario !== perfis.paciente && agenda.nivelProbabilidadeFalta && (agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.retornoAgendado) && (
                                <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider ${
                                  agenda.nivelProbabilidadeFalta === "Alta" ? "text-red-600" :
                                  agenda.nivelProbabilidadeFalta === "Média" ? "text-amber-600" :
                                  "text-green-600"
                                }`}>
                                  Risco {agenda.nivelProbabilidadeFalta} {agenda.probabilidadeFalta !== undefined ? `(${agenda.probabilidadeFalta}%)` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {(tipoUsuario !== perfis.paciente && tipoUsuario !== perfis.medico || isAdmin) && (
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {agenda.profissionalFotoBase64 ? (
                                  <img src={agenda.profissionalFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <Stethoscope className="w-5 h-5" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-800">{agenda.nomeProfissional}</span>
                                <span className="text-xs font-semibold text-gray-500 mt-0.5">{agenda.tipoProfissional === perfis.medico ? 'Médico' : 'Enfermeira'}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-700">
                              {MapNomesTipoConsulta[agenda.tipoConsulta] || agenda.tipoConsulta}
                            </span>
                            {agenda.tipoConsulta === "ConsultaMedica" && agenda.especialidade && (
                              <span className="text-[10px] text-[#7C3AED] font-bold uppercase tracking-wider mt-1">
                                {MapNomesEspecialidade[agenda.especialidade] || agenda.especialidade}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${
                              agenda.status === statusAgendamento.agendado ? 'bg-[#3B82F6]' :
                              agenda.status === statusAgendamento.emAtendimento ? 'bg-[#F59E0B]' :
                              agenda.status === statusAgendamento.aguardandoRetorno ? 'bg-[#F97316]' :
                              agenda.status === statusAgendamento.retornoAgendado ? 'bg-[#7C3AED]' :
                              agenda.status === statusAgendamento.finalizado ? 'bg-[#10B981]' :
                              agenda.status === statusAgendamento.cancelado ? 'bg-[#6B7280]' :
                              agenda.status === statusAgendamento.faltou ? 'bg-[#EF4444]' :
                              'bg-[#7C3AED]'
                            }`}>
                              {MapNomesStatus[agenda.status] || agenda.status}
                            </span>
                            {isPendenteAtualizacao && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                Pendente de atualização
                              </span>
                            )}
                            {agenda.exigeResultadoPosterior && agenda.status === statusAgendamento.finalizado && !agenda.resultadoDisponivel && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                Resultado pendente
                              </span>
                            )}
                            {agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                Resultado pronto
                              </span>
                            )}
                            {agenda.exigeResultadoPosterior && agenda.resultadoRetirado && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100">
                                Retirado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onAlterarStatus && opcoesValidas.length > 0 && (
                              <div className="relative">
                                <select
                                  className="appearance-none bg-white text-[#7C3AED] border border-[#7C3AED] text-[10px] font-bold py-1.5 pl-2.5 pr-6 rounded-lg cursor-pointer outline-none hover:bg-purple-50 transition-colors"
                                  value={agenda.status}
                                  onChange={(e) => onAlterarStatus(agenda.id, e.target.value)}
                                >
                                  <option value={agenda.status} disabled>Status</option>
                                  {opcoesValidas.map(op => (
                                    <option key={op} value={op}>{MapNomesStatus[op]}</option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-[#7C3AED]">
                                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                              </div>
                            )}
                            {onHistorico && (
                              <button
                                title="Histórico"
                                onClick={() => onHistorico(agenda.id)}
                                className="p-1.5 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-lg transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {agenda.status === statusAgendamento.aguardandoRetorno ? (
                              tipoUsuario !== perfis.paciente && onAgendarRetorno && (
                                <button
                                  title="Agendar Retorno"
                                  onClick={() => onAgendarRetorno(agenda)}
                                  className="p-1.5 border border-purple-200 text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-colors bg-white"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              podeRemarcar && onRemarcar && (
                                <button
                                  title="Remarcar"
                                  onClick={() => onRemarcar(agenda)}
                                  className="p-1.5 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-lg transition-colors"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                            {onConcluirExame && agenda.tipoConsulta === 'Exame' && agenda.status === statusAgendamento.emAtendimento && (
                              <button
                                onClick={() => onConcluirExame(agenda)}
                                className="px-2.5 py-1.5 text-[10px] font-black bg-[#7C3AED] text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                              >
                                Concluir
                              </button>
                            )}
                            {onMarcarResultadoDisponivel && agenda.exigeResultadoPosterior && agenda.status === statusAgendamento.finalizado && !agenda.resultadoDisponivel && (
                              <button
                                onClick={() => onMarcarResultadoDisponivel(agenda.id)}
                                className="px-2.5 py-1.5 text-[10px] font-black bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Notificar
                              </button>
                            )}
                            {onMarcarResultadoRetirado && agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado && (
                              <button
                                onClick={() => onMarcarResultadoRetirado(agenda.id)}
                                className="px-2.5 py-1.5 text-[10px] font-black bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                Retirada
                              </button>
                            )}
                            {podeCancelar && onCancelar && (
                              <button
                                onClick={() => onCancelar(agenda.id, agenda.pacienteNome)}
                                className="px-2.5 py-1.5 text-[10px] font-black bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Caso contrário: Modo Agenda (Grid de Cards Clássicos agrupados por Dia)
  return (
    <div className="space-y-12">
      {agendamentosAgrupados.map((grupo) => (
        <div key={grupo.dataChave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header de Data */}
          <div className="flex items-center justify-between pt-2 pb-1 border-b border-purple-100/50">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#7C3AED]" />
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider bg-purple-50 text-[#7C3AED] px-3.5 py-1.5 rounded-xl border border-purple-100/60 shadow-sm">
                {formatarHeaderData(grupo.dataChave)}
              </h3>
            </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
              {grupo.itens.length} {grupo.itens.length === 1 ? "atendimento" : "atendimentos"}
            </span>
          </div>

          {/* Grid de Cards Clássicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {grupo.itens.map((agenda) => {
              const dataObj = getRealDate(agenda.dataHoraConsulta)!;
              const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const opcoesValidas = obterOpcoesPermitidas(agenda.status, agenda.tipoConsulta, agenda.dataHoraConsulta);
              const podeCancelar = agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.retornoAgendado;
              const podeRemarcar = agenda.status !== statusAgendamento.finalizado && agenda.status !== statusAgendamento.cancelado;
              
              const duasHorasAtras = new Date();
              duasHorasAtras.setHours(duasHorasAtras.getHours() - 2);
              const isPendenteAtualizacao = dataObj < duasHorasAtras && (agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.emAtendimento);

              return (
                <div
                  id={`agendamento-${agenda.id}`}
                  key={agenda.id}
                  className={`bg-white rounded-3xl shadow-md border flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:border-purple-200 ${
                    agenda.id === agendamentoDestaque
                      ? 'border-purple-400 shadow-lg shadow-purple-200/60 ring-2 ring-purple-300'
                      : 'border-gray-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Cabeçalho do Card: Horário e Status */}
                  <div className="p-5 sm:p-6 pb-3 sm:pb-4 flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-2xl sm:text-3xl font-black text-[#7C3AED] leading-none">{hora}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest pl-0.5">Horário</span>
                    </div>
                    
                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm ${
                        agenda.status === statusAgendamento.agendado ? 'bg-[#3B82F6]' :
                        agenda.status === statusAgendamento.emAtendimento ? 'bg-[#F59E0B]' :
                        agenda.status === statusAgendamento.aguardandoRetorno ? 'bg-[#F97316]' :
                        agenda.status === statusAgendamento.retornoAgendado ? 'bg-[#7C3AED]' :
                        agenda.status === statusAgendamento.finalizado ? 'bg-[#10B981]' :
                        agenda.status === statusAgendamento.cancelado ? 'bg-[#6B7280]' :
                        agenda.status === statusAgendamento.faltou ? 'bg-[#EF4444]' :
                        'bg-[#7C3AED]'
                      }`}>
                        {MapNomesStatus[agenda.status] || agenda.status}
                      </span>
                      {isPendenteAtualizacao && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                          Pendente de atualização
                        </span>
                      )}
                      {agenda.exigeResultadoPosterior && agenda.status === statusAgendamento.finalizado && !agenda.resultadoDisponivel && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          Resultado pendente
                        </span>
                      )}
                      {agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                          Resultado pronto
                        </span>
                      )}
                      {agenda.exigeResultadoPosterior && agenda.resultadoRetirado && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100">
                          Retirado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Corpo do Card: Paciente ou Profissional */}
                  <div className="px-5 sm:px-6 py-4 flex-1 flex flex-col justify-center border-t border-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden shadow-sm">
                        {tipoUsuario === perfis.paciente ? (
                          agenda.profissionalFotoBase64 ? (
                            <img src={agenda.profissionalFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            agenda.nomeProfissional ? agenda.nomeProfissional.charAt(0).toUpperCase() : "?"
                          )
                        ) : (
                          agenda.pacienteFotoBase64 ? (
                            <img src={agenda.pacienteFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            agenda.pacienteNome ? agenda.pacienteNome.charAt(0).toUpperCase() : "?"
                          )
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-gray-900 leading-tight">
                            {tipoUsuario === perfis.paciente 
                              ? (agenda.nomeProfissional || "Profissional não informado") 
                              : (agenda.pacienteNome || "Paciente não informado")}
                          </h4>
                          {tipoUsuario !== perfis.paciente && agenda.nivelProbabilidadeFalta && (agenda.status === statusAgendamento.agendado || agenda.status === statusAgendamento.retornoAgendado) && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              agenda.nivelProbabilidadeFalta === "Alta" ? "bg-red-50 text-red-600 border border-red-100" :
                              agenda.nivelProbabilidadeFalta === "Média" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              "bg-green-50 text-green-600 border border-green-100"
                            }`}>
                              Risco {agenda.nivelProbabilidadeFalta} {agenda.probabilidadeFalta !== undefined ? `(${agenda.probabilidadeFalta}%)` : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5 leading-none">
                          {agenda.tipoConsulta ? (MapNomesTipoConsulta[agenda.tipoConsulta] || agenda.tipoConsulta) : "Consulta"}
                          {agenda.tipoConsulta === "ConsultaMedica" && agenda.especialidade ? ` • ${MapNomesEspecialidade[agenda.especialidade] || agenda.especialidade}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Separador e Profissional Secundário (Apenas para Enfermeira / Admin) */}
                  {(tipoUsuario !== perfis.paciente && tipoUsuario !== perfis.medico || isAdmin) && (
                    <div className="px-5 sm:px-6 py-3.5 border-t border-gray-50 flex items-center gap-4 bg-purple-50/10">
                      <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {agenda.profissionalFotoBase64 ? (
                          <img src={agenda.profissionalFotoBase64} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Stethoscope className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{agenda.nomeProfissional}</span>
                        <span className="text-xs font-semibold text-gray-400 mt-0.5">{agenda.tipoProfissional === perfis.medico ? 'Médico' : 'Enfermeira'}</span>
                      </div>
                    </div>
                  )}

                  {/* Rodapé: Ações */}
                  {((onAlterarStatus && opcoesValidas.length > 0) ||
                    onHistorico ||
                    (agenda.status === 'AguardandoRetorno' && tipoUsuario !== 'Paciente' && onAgendarRetorno) ||
                    (podeRemarcar && onRemarcar) ||
                    (podeCancelar && onCancelar) ||
                    (onConcluirExame && agenda.tipoConsulta === 'Exame' && agenda.status === 'EmAtendimento') ||
                    (onMarcarResultadoDisponivel && agenda.exigeResultadoPosterior && agenda.status === 'Finalizado' && !agenda.resultadoDisponivel) ||
                    (onMarcarResultadoRetirado && agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado)) && (
                      <div className="px-5 py-4 border-t border-gray-50 flex flex-col gap-3">
                        {onAlterarStatus && opcoesValidas.length > 0 && (
                          <div className="relative w-full">
                            <select
                              className="w-full appearance-none bg-white text-[#7C3AED] border border-[#7C3AED] text-[10px] font-bold py-2 pl-3 pr-8 rounded-xl cursor-pointer outline-none hover:bg-purple-50 transition-colors"
                              value={agenda.status}
                              onChange={(e) => onAlterarStatus(agenda.id, e.target.value)}
                            >
                              <option value={agenda.status} disabled>Status</option>
                              {opcoesValidas.map(op => (
                                <option key={op} value={op}>{MapNomesStatus[op]}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#7C3AED]">
                              <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex gap-2">
                            {onHistorico && (
                              <button
                                title="Histórico"
                                onClick={() => onHistorico(agenda.id)}
                                className="flex items-center justify-center w-9 h-9 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-xl transition-all active:scale-95 shadow-sm"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            {agenda.status === statusAgendamento.aguardandoRetorno ? (
                              tipoUsuario !== perfis.paciente && onAgendarRetorno && (
                                <button
                                  title="Agendar Retorno"
                                  onClick={() => onAgendarRetorno(agenda)}
                                  className="flex items-center justify-center w-9 h-9 border border-purple-200 text-[#7C3AED] hover:bg-purple-50 rounded-xl transition-all bg-white active:scale-95 shadow-sm"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                              )
                            ) : (
                              podeRemarcar && onRemarcar && (
                                <button
                                  title="Remarcar"
                                  onClick={() => onRemarcar(agenda)}
                                  className="flex items-center justify-center w-9 h-9 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>

                          <div className="flex gap-2 justify-end">
                            {podeCancelar && onCancelar && (
                              <button
                                onClick={() => onCancelar(agenda.id, agenda.pacienteNome)}
                                className="px-3.5 py-2 text-[10px] font-black bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                              >
                                Cancelar
                              </button>
                            )}
                            {onConcluirExame && agenda.tipoConsulta === 'Exame' && agenda.status === statusAgendamento.emAtendimento && (
                              <button
                                onClick={() => onConcluirExame(agenda)}
                                className="px-3.5 py-2 text-[10px] font-black bg-[#7C3AED] text-white rounded-xl hover:bg-purple-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                              >
                                Concluir
                              </button>
                            )}
                            {onMarcarResultadoDisponivel && agenda.exigeResultadoPosterior && agenda.status === statusAgendamento.finalizado && !agenda.resultadoDisponivel && (
                              <button
                                onClick={() => onMarcarResultadoDisponivel(agenda.id)}
                                className="px-3.5 py-2 text-[10px] font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                              >
                                Notificar
                              </button>
                            )}
                            {onMarcarResultadoRetirado && agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado && (
                              <button
                                onClick={() => onMarcarResultadoRetirado(agenda.id)}
                                className="px-3.5 py-2 text-[10px] font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                              >
                                Retirada
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
