import { Clock, Calendar, CalendarPlus, Stethoscope } from 'lucide-react';
import { getRealDate } from "../utils/dates";
import { MapNomesStatus, MapNomesTipoConsulta, MapNomesEspecialidade } from "../constants/statusMap";

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

  // Lógica de agrupamento por dia
  const agendamentosAgrupados = (() => {
    const grupos: Record<string, AgendamentoVisualizadorItem[]> = {};
    agendamentos.forEach(a => {
      const dataObj = getRealDate(a.dataHoraConsulta);
      if (dataObj) {
        const chave = dataObj.toISOString().split('T')[0];
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
    const hojeStr = new Date().toISOString().split('T')[0];
    
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];

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
    if (tipoUsuario === "Paciente") return [];

    const hojeStr = new Date().toISOString().split('T')[0];
    const dataConsultaStr = new Date(dataHoraConsulta).toISOString().split('T')[0];
    const ehHojeOuPassado = dataConsultaStr <= hojeStr;

    switch (statusAtual) {
      case "Agendado": 
        return ehHojeOuPassado ? ["EmAtendimento", "Faltou"] : [];
      case "EmAtendimento":
        if (tipoConsulta === "ConsultaMédica" || tipoConsulta === "Consulta Médica" || tipoConsulta === "ConsultaMedica")
          return ["AguardandoRetorno", "Finalizado"];
        if (tipoConsulta === "Exame")
          return [];
        return ["Finalizado"];
      case "AguardandoRetorno": return [];
      case "RetornoAgendado": 
        return ehHojeOuPassado ? ["Finalizado", "Faltou"] : [];
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

          {/* Tabela ou Agenda */}
          {modoExibicao === "tabela" ? (
            <div className="overflow-x-auto bg-white rounded-3xl border border-gray-100/80 shadow-xl shadow-purple-100/5">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-purple-50/40 border-b border-purple-100/40">
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">Horário</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-purple-600">
                      {tipoUsuario === "Paciente" ? "Profissional" : "Paciente"}
                    </th>
                    {(tipoUsuario !== "Paciente" && tipoUsuario !== "Medico" || isAdmin) && (
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
                    const podeCancelar = agenda.status === "Agendado" || agenda.status === "RetornoAgendado";
                    const podeRemarcar = agenda.status !== "Finalizado" && agenda.status !== "Cancelado";
                    
                    return (
                      <tr key={agenda.id} className={`hover:bg-purple-50/10 transition-colors group ${agenda.id === agendamentoDestaque ? "bg-purple-50/40 font-semibold" : ""}`}>
                        {/* Horário */}
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            <span className="text-base font-black text-gray-800">{hora}</span>
                          </div>
                        </td>
                        {/* Paciente / Profissional Principal */}
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-base overflow-hidden shadow-sm shrink-0 animate-in fade-in zoom-in duration-200">
                              {tipoUsuario === "Paciente" ? (
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
                                {tipoUsuario === "Paciente" ? agenda.nomeProfissional : agenda.pacienteNome}
                              </span>
                              {tipoUsuario !== "Paciente" && agenda.nivelProbabilidadeFalta && (agenda.status === "Agendado" || agenda.status === "RetornoAgendado") && (
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
                        {/* Profissional Secundário (Enfermeira / Admin) */}
                        {(tipoUsuario !== "Paciente" && tipoUsuario !== "Medico" || isAdmin) && (
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
                                <span className="text-xs font-semibold text-gray-500 mt-0.5">{agenda.tipoProfissional === 'Medico' ? 'Médico' : 'Enfermeira'}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Tipo / Especialidade */}
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
                        {/* Status */}
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${
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
                        </td>
                        {/* Ações */}
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
                            {/* Histórico */}
                            {onHistorico && (
                              <button
                                title="Histórico"
                                onClick={() => onHistorico(agenda.id)}
                                className="p-1.5 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-lg transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Remarcar / Retorno */}
                            {agenda.status === 'AguardandoRetorno' ? (
                              tipoUsuario !== 'Paciente' && onAgendarRetorno && (
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
                            {/* Concluir Exame */}
                            {onConcluirExame && agenda.tipoConsulta === 'Exame' && agenda.status === 'EmAtendimento' && (
                              <button
                                onClick={() => onConcluirExame(agenda)}
                                className="px-2.5 py-1.5 text-[10px] font-black bg-[#7C3AED] text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                              >
                                Concluir
                              </button>
                            )}
                            {/* Notificar / Retirar */}
                            {onMarcarResultadoDisponivel && agenda.exigeResultadoPosterior && agenda.status === 'Finalizado' && !agenda.resultadoDisponivel && (
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
                            {/* Cancelar */}
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
          ) : (
            /* Modo Agenda (Timeline cronológica vertical) */
            <div className="relative pl-6 sm:pl-8 border-l-2 border-purple-100 space-y-6 ml-4 sm:ml-6 my-4">
              {grupo.itens.map((agenda) => {
                const dataObj = getRealDate(agenda.dataHoraConsulta)!;
                const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const opcoesValidas = obterOpcoesPermitidas(agenda.status, agenda.tipoConsulta, agenda.dataHoraConsulta);
                const podeCancelar = agenda.status === "Agendado" || agenda.status === "RetornoAgendado";
                const podeRemarcar = agenda.status !== "Finalizado" && agenda.status !== "Cancelado";

                return (
                  <div key={agenda.id} className="relative group">
                    {/* Ícone no eixo da Timeline */}
                    <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 bg-white w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-[#7C3AED] flex items-center justify-center text-[#7C3AED] shadow-sm group-hover:scale-110 transition-transform z-10">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>

                    {/* Cartão de Compromisso */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:border-purple-200/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Info Principal */}
                      <div className="flex items-start sm:items-center gap-4">
                        {/* Bloco de Horário */}
                        <div className="flex flex-col items-center justify-center bg-purple-50 text-[#7C3AED] px-3.5 py-2.5 rounded-xl shrink-0 border border-purple-100/50 shadow-sm">
                          <span className="text-lg font-black tracking-tight leading-none">{hora}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest mt-1">Horário</span>
                        </div>

                        {/* Foto / Nome */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden shadow-sm">
                            {tipoUsuario === "Paciente" ? (
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
                            <h4 className="text-sm font-black text-gray-900 group-hover:text-[#7C3AED] transition-colors leading-snug">
                              {tipoUsuario === "Paciente" ? agenda.nomeProfissional : agenda.pacienteNome}
                            </h4>
                            <p className="text-xs font-semibold text-gray-500 flex flex-wrap items-center gap-x-1.5 mt-0.5 leading-none">
                              <span>{MapNomesTipoConsulta[agenda.tipoConsulta] || agenda.tipoConsulta}</span>
                              {agenda.tipoConsulta === "ConsultaMedica" && agenda.especialidade && (
                                <span className="text-[#7C3AED] font-bold uppercase tracking-wider text-[9px]">
                                  • {MapNomesEspecialidade[agenda.especialidade] || agenda.especialidade}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Informações Secundárias e Ações */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:justify-end">
                        {/* Nome do Médico se Enfermeira/Admin */}
                        {(tipoUsuario !== "Paciente" && tipoUsuario !== "Medico" || isAdmin) && (
                          <div className="flex items-center gap-2 border-r border-gray-100 pr-3 sm:pr-4">
                            <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Profissional:</span>
                            <span className="text-xs font-bold text-gray-700">{agenda.nomeProfissional}</span>
                          </div>
                        )}

                        {/* Badge de Status */}
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
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

                        {/* Ações Rápidas */}
                        <div className="flex items-center gap-1.5">
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
                          {/* Botão Histórico */}
                          {onHistorico && (
                            <button
                              title="Histórico"
                              onClick={() => onHistorico(agenda.id)}
                              className="p-2 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-xl transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Remarcar / Retorno */}
                          {agenda.status === 'AguardandoRetorno' ? (
                            tipoUsuario !== 'Paciente' && onAgendarRetorno && (
                              <button
                                title="Agendar Retorno"
                                onClick={() => onAgendarRetorno(agenda)}
                                className="p-2 border border-purple-200 text-[#7C3AED] hover:bg-purple-50 rounded-xl transition-colors bg-white"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </button>
                            )
                          ) : (
                            podeRemarcar && onRemarcar && (
                              <button
                                title="Remarcar"
                                onClick={() => onRemarcar(agenda)}
                                className="p-2 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 rounded-xl transition-colors"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          {/* Concluir Exame */}
                          {onConcluirExame && agenda.tipoConsulta === 'Exame' && agenda.status === 'EmAtendimento' && (
                            <button
                              onClick={() => onConcluirExame(agenda)}
                              className="px-3 py-2 text-[10px] font-black bg-[#7C3AED] text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                            >
                              Concluir
                            </button>
                          )}
                          {onMarcarResultadoDisponivel && agenda.exigeResultadoPosterior && agenda.status === 'Finalizado' && !agenda.resultadoDisponivel && (
                            <button
                              onClick={() => onMarcarResultadoDisponivel(agenda.id)}
                              className="px-3 py-2 text-[10px] font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Notificar
                            </button>
                          )}
                          {onMarcarResultadoRetirado && agenda.exigeResultadoPosterior && agenda.resultadoDisponivel && !agenda.resultadoRetirado && (
                            <button
                              onClick={() => onMarcarResultadoRetirado(agenda.id)}
                              className="px-3 py-2 text-[10px] font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              Retirada
                            </button>
                          )}
                          {/* Cancelar */}
                          {podeCancelar && onCancelar && (
                            <button
                              onClick={() => onCancelar(agenda.id, agenda.pacienteNome)}
                              className="px-3 py-2 text-[10px] font-black bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
