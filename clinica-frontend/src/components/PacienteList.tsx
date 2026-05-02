import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { AlertCircle, Users, CheckCircle, Clock, Search, Filter, RefreshCw, Inbox, Pencil, Key, Trash, AlertTriangle, Check, Copy } from 'lucide-react';
import type { PacienteResponse } from "../types/PacienteResponse";

interface PacienteListProps {
  recarregarContador?: number;
  pacienteInicialEdicao?: PacienteResponse | null;
  onFinalizouEdicaoExterno?: () => void;
}

interface PacienteEdicao {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}


export default function PacienteList({ 
  recarregarContador = 0, 
  pacienteInicialEdicao = null,
  onFinalizouEdicaoExterno
}: PacienteListProps) {
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshInterno, setRefreshInterno] = useState(0);

  // Estado de busca
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaCpf, setBuscaCpf] = useState("");
  const [perfisSelecionados, setPerfisSelecionados] = useState<string[]>(["Paciente", "Medico", "Enfermeira"]);
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const limparFiltros = () => {
    setBuscaNome("");
    setBuscaCpf("");
    setPerfisSelecionados(["Paciente", "Medico", "Enfermeira"]);
  };

  // Estado do modal de edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PacienteEdicao>({ nome: "", cpf: "", telefone: "", email: "" });
  const [salvando, setSalvando] = useState(false);

  // Estado do modal de exclusão
  const [excluindoPaciente, setExcluindoPaciente] = useState<{ id: string, nome: string } | null>(null);
  const [excluindoLoader, setExcluindoLoader] = useState(false);

  // Estado do modal de reset de senha
  const [pacienteReset, setPacienteReset] = useState<{ id: string, usuarioId: string, nome: string } | null>(null);
  const [novaSenhaReset, setNovaSenhaReset] = useState("");
  const [senhaExibida, setSenhaExibida] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMensagem, setResetMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isEnfermeira = localStorage.getItem("tipoUsuario") === "Enfermeira";

  useEffect(() => {
    const timer = setTimeout(() => {
      setCarregando(true);
      setErro(null);

      const params = new URLSearchParams();
      const termoBusca = buscaNome.trim();
      if (termoBusca) {
        // Se for só números e tiver tamanho de CPF, buscamos por CPF, senão por Nome
        if (/^\d+$/.test(termoBusca)) {
          params.set("cpf", termoBusca);
        } else {
          params.set("nome", termoBusca);
        }
      }

      const queryString = params.toString();
      const url = `http://localhost:5045/api/Pacientes${queryString ? `?${queryString}` : ""}`;

      const token = localStorage.getItem("authToken");
      fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) throw new Error(`Erro ao buscar pacientes: ${res.status}`);
          return res.json();
        })
        .then((data: PacienteResponse[]) => setPacientes(data))
        .catch((err: Error) => setErro(err.message))
        .finally(() => setCarregando(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [recarregarContador, refreshInterno, buscaNome, buscaCpf]);

  // Efeito para abrir edição externa (Vindo da Agenda por exemplo)
  useEffect(() => {
    if (pacienteInicialEdicao) {
      abrirEdicao(pacienteInicialEdicao);
    }
  }, [pacienteInicialEdicao]);

  const abrirEdicao = (p: PacienteResponse) => {
    setEditandoId(p.id);
    setForm({ nome: p.nome, cpf: p.cpf, telefone: p.telefone, email: p.email });
  };

  const fecharModal = () => {
    setEditandoId(null);
    if (onFinalizouEdicaoExterno) onFinalizouEdicaoExterno();
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    setSalvando(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Pacientes/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const erro = await response.text();
        alert(erro);
        return;
      }
      fecharModal();
      setRefreshInterno((prev) => prev + 1);
    } catch (err) {
      alert("Erro ao salvar edição.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalExclusao = (id: string, nome: string) => {
    setExcluindoPaciente({ id, nome });
  };

  const fecharModalExclusao = () => {
    setExcluindoPaciente(null);
  };

  const confirmarExclusao = async () => {
    if (!excluindoPaciente) return;
    setExcluindoLoader(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/Pacientes/${excluindoPaciente.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const erro = await response.text();
        alert(erro);
        return;
      }
      setExcluindoPaciente(null);
      setRefreshInterno((prev) => prev + 1);
    } catch (err) {
      alert("Erro ao excluir paciente.");
    } finally {
      setExcluindoLoader(false);
    }
  };

  const handleResetSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteReset || !novaSenhaReset) return;
    setResetLoading(true);
    setResetMensagem(null);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5045/api/LoginPortal/${pacienteReset.usuarioId}/reset-senha`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ novaSenha: novaSenhaReset })
      });

      if (!response.ok) {
        const err = await response.text();
        setResetMensagem({ texto: err || "Erro ao redefinir.", erro: true });
      } else {
        setSenhaExibida(novaSenhaReset);
        setNovaSenhaReset("");
        setResetMensagem(null);
      }
    } catch (e) {
      setResetMensagem({ texto: "Falha de conexão.", erro: true });
    } finally {
      setResetLoading(false);
    }
  };

  const fecharModalReset = () => {
    setPacienteReset(null);
    setNovaSenhaReset("");
    setSenhaExibida(null);
    setResetMensagem(null);
    setCopiado(false);
  };

  const copiarSenha = () => {
    if (!senhaExibida) return;
    navigator.clipboard.writeText(senhaExibida);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (erro) {
    return <p className="text-center text-red-500 py-8">{erro}</p>;
  }

  const totalPacientes = pacientes.filter(p => p.tipo === "Paciente").length;
  const totalMedicos = pacientes.filter(p => p.tipo === "Medico").length;
  const totalEnfermeiras = pacientes.filter(p => p.tipo === "Enfermeira").length;

  // Simulação de dados para os cards solicitados
  const usuariosAtivosMes = Math.floor(pacientes.length * 0.85); // 85% ativos
  const pacientesInativos = pacientes.filter((_, idx) => idx % 7 === 0); // Mock de inativos (+60 dias)

  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 shadow-sm max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Ops! Algo deu errado</h3>
          <p className="text-sm opacity-90">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- CARDS DE RESUMO --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Usuários por Tipo */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total de Usuários</span>
          </div>
          <h4 className="text-2xl font-black text-gray-800 mb-2">{pacientes.length}</h4>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold">{totalPacientes} Pacientes</span>
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold">{totalMedicos} Médicos</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">{totalEnfermeiras} Enf.</span>
          </div>
        </div>

        {/* Card: Usuários Ativos este mês */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ativos no Mês</span>
          </div>
          <h4 className="text-2xl font-black text-gray-800 mb-2">{usuariosAtivosMes}</h4>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
            <span className="text-green-500 font-bold">▲ 12%</span> em relação ao mês anterior
          </p>
        </div>

        {/* Card: Pacientes Inativos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Atenção Necessária</span>
          </div>
          <h4 className="text-2xl font-black text-gray-800 mb-2">{pacientesInativos.length} Inativos</h4>
          <p className="text-xs text-gray-400 mb-4 font-medium">+60 dias sem acessar o portal</p>
          <button className="w-full py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100 transition-colors">
            Ver lista detalhada
          </button>
        </div>
      </div>

      {/* --- TABELA E FILTROS --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Header da Tabela / Filtros */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Busca Unificada (Nome ou CPF) */}
            <div className="relative group flex-1 min-w-[320px]">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou CPF..."
                className="w-full pl-12 pr-4 py-3 bg-purple-50/30 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-[#7C3AED] focus:bg-white transition-all outline-none font-medium text-sm text-gray-700"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
              />
            </div>

            {/* Filtro Tipo */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setMenuFiltroAberto(!menuFiltroAberto)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl min-w-[160px] transition-all text-sm font-bold shadow-sm ${
                    menuFiltroAberto ? 'border-purple-600 bg-purple-50 text-purple-700 ring-4 ring-purple-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Tipo: ({perfisSelecionados.length})
                </button>

                {menuFiltroAberto && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuFiltroAberto(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                      <div className="px-4 py-1 mb-2 border-b border-gray-50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrar Categoria</span>
                      </div>
                      {["Paciente", "Medico", "Enfermeira"].map((perfil) => (
                        <label key={perfil} className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 cursor-pointer transition-colors group">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-all cursor-pointer"
                            checked={perfisSelecionados.includes(perfil)}
                            onChange={(e) => {
                              if (e.target.checked) setPerfisSelecionados([...perfisSelecionados, perfil]);
                              else setPerfisSelecionados(perfisSelecionados.filter(p => p !== perfil));
                            }}
                          />
                          <span className="text-sm font-bold text-gray-600 group-hover:text-purple-700">
                            {perfil === "Medico" ? "Médico" : perfil}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={limparFiltros}
              className="p-3 bg-gray-50 text-gray-400 border border-gray-200 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center gap-2 group shadow-sm"
              title="Limpar Filtros"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform duration-300" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Limpar Filtros</span>
            </button>
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            Total: {pacientes.length} registros
          </div>
        </div>

        {/* Listagem */}
        <div className="overflow-x-auto">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Usuário</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[2px]">CPF</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Categoria</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Último Acesso</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pacientes.filter(p => perfisSelecionados.includes(p.tipo)).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <Inbox className="w-12 h-12" />
                        <p className="text-sm font-bold">Nenhum resultado para os filtros atuais.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pacientes
                    .filter(p => perfisSelecionados.includes(p.tipo))
                    .map((p) => (
                    <tr key={p.id} className="group hover:bg-purple-50/30 transition-colors">
                      {/* Avatar + Nome */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center text-purple-700 font-black text-sm uppercase ring-2 ring-purple-50 group-hover:ring-purple-100 transition-all">
                            {p.nome.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 group-hover:text-purple-900 transition-colors">{p.nome}</span>
                            <span className="text-[11px] text-gray-400 font-medium truncate max-w-[150px]">{p.email}</span>
                          </div>
                        </div>
                      </td>
                      {/* CPF */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-500 font-medium">{mascaraCpf(p.cpf)}</span>
                      </td>
                      {/* Perfil Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          p.tipo === 'Paciente' ? 'bg-green-50 text-green-600 border-green-100' : 
                          p.tipo === 'Medico' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                             p.tipo === 'Paciente' ? 'bg-green-500' : 
                             p.tipo === 'Medico' ? 'bg-purple-500' : 
                             'bg-blue-500'
                          }`}></span>
                          {p.tipo === 'Medico' ? 'Médico' : p.tipo}
                        </span>
                      </td>

                      {/* Último Acesso (Real) */}
                      <td className="px-6 py-4">
                         <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-gray-700">
                               {p.ultimoAcesso ? new Date(p.ultimoAcesso).toLocaleString('pt-BR', { 
                                  day: '2-digit', month: '2-digit', year: '2-digit', 
                                  hour: '2-digit', minute: '2-digit' 
                               }) : 'Sem registro'}
                            </span>
                         </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            title="Editar Dados"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            onClick={() => abrirEdicao(p)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {(isAdmin || isEnfermeira) && p.usuarioId && (
                            <button
                              title="Redefinir Senha"
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                              onClick={() => setPacienteReset({ id: p.id, usuarioId: p.usuarioId!, nome: p.nome })}
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title="Excluir Usuário"
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            onClick={() => abrirModalExclusao(p.id, p.nome)}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Paginação */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Página 1 de 1
          </p>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-300 cursor-not-allowed">Anterior</button>
            <button className="px-4 py-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-600 hover:bg-purple-50 shadow-sm transition-all">Próxima</button>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {editandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Editar Paciente</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full bg-gray-50"
                  placeholder="Nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full bg-gray-200 text-gray-500 cursor-not-allowed"
                  value={form.cpf}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full bg-gray-50"
                  maxLength={15}
                  placeholder="Telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="p-2 border rounded w-full bg-gray-50"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={fecharModal}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvando}
              >
                {salvando ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {excluindoPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Excluir Paciente</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Tem certeza que deseja excluir <strong>{excluindoPaciente.nome}</strong>? Esta ação não poderá ser desfeita.
            </p>

            <div className="flex justify-center gap-3">
              <button
                className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors w-full"
                onClick={fecharModalExclusao}
                disabled={excluindoLoader}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 w-full"
                onClick={confirmarExclusao}
                disabled={excluindoLoader}
              >
                {excluindoLoader ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Reset de Senha */}
      {pacienteReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Redefinir Senha</h3>
            <p className="text-sm text-gray-600 mb-4">Paciente: <span className="font-semibold">{pacienteReset.nome}</span></p>
            
            {resetMensagem && (
              <div className={`p-3 rounded mb-4 text-sm ${resetMensagem.erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {resetMensagem.texto}
              </div>
            )}

            {senhaExibida ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4 text-center">
                <p className="text-sm font-semibold text-amber-800 mb-2">Anote esta senha — ela não será exibida novamente:</p>
                <div className="relative group">
                  <p className="text-2xl font-mono font-bold text-gray-900 bg-white border border-dashed border-amber-300 py-2 px-8 rounded">
                    {senhaExibida}
                  </p>
                  <button
                    onClick={copiarSenha}
                    title="Copiar senha"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-all active:scale-95"
                  >
                    {copiado ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  {copiado && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded shadow-lg animate-bounce">
                      Copiado!
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-600 mt-2">Passe esta senha de forma segura para o paciente.</p>
              </div>
            ) : (
              <form onSubmit={handleResetSenha}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <input
                    type="text"
                    required
                    value={novaSenhaReset}
                    onChange={(e) => setNovaSenhaReset(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Digite a nova senha provisória"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className={`w-full text-white font-bold py-2.5 rounded transition-colors mb-2 ${resetLoading ? "bg-amber-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"}`}
                >
                  {resetLoading ? "Redefinindo..." : "Confirmar Redefinição"}
                </button>
              </form>
            )}

            <button
              onClick={fecharModalReset}
              className="w-full mt-2 text-gray-600 hover:bg-gray-100 font-medium py-2 rounded transition-colors"
            >
              {senhaExibida ? "Fechar" : "Cancelar"}
            </button>
          </div>
        </div>
      )}
  </div>
  );
}
