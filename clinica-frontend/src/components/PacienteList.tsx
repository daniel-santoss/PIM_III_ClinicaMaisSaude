import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
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
      if (buscaNome.trim()) params.set("nome", buscaNome.trim());
      if (buscaCpf.trim()) params.set("cpf", buscaCpf.trim());

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

  return (
    <>
      {/* Barra de Pesquisa */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Filtrar por nome</label>
          <input
            type="text"
            className="p-2 border border-gray-300 rounded w-full bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="Digite o nome..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Filtrar por CPF</label>
          <input
            type="text"
            className="p-2 border border-gray-300 rounded w-full bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="Digite os números..."
            maxLength={11}
            value={buscaCpf}
            onChange={(e) => setBuscaCpf(e.target.value)}
          />
        </div>

        {isAdmin && (
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Perfis</label>
            <button
              onClick={() => setMenuFiltroAberto(!menuFiltroAberto)}
              className={`flex items-center gap-2 p-2 border rounded-lg min-w-[140px] transition-all ${
                menuFiltroAberto ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50 text-blue-700' : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              <span className="text-sm font-medium">Filtrar ({perfisSelecionados.length})</span>
              <svg className={`w-3 h-3 ml-auto transition-transform ${menuFiltroAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {menuFiltroAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuFiltroAberto(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in duration-150 origin-top-right">
                  <div className="px-3 py-1 mb-1 border-b border-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selecionar Perfil</span>
                  </div>
                  {["Paciente", "Medico", "Enfermeira"].map((perfil) => (
                    <label key={perfil} className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all"
                          checked={perfisSelecionados.includes(perfil)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPerfisSelecionados([...perfisSelecionados, perfil]);
                            } else {
                              setPerfisSelecionados(perfisSelecionados.filter(p => p !== perfil));
                            }
                          }}
                        />
                        <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                        {perfil === "Medico" ? "Médico" : perfil}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {carregando ? (
        <p className="text-center text-gray-500 py-8">Carregando dados…</p>
      ) : (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Nome
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                CPF
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Telefone
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Perfil
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {pacientes.filter(p => perfisSelecionados.includes(p.tipo)).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Nenhum usuário encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              pacientes
                .filter(p => perfisSelecionados.includes(p.tipo))
                .map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{mascaraCpf(p.cpf)}</td>
                  <td className="px-4 py-3 text-gray-600">{mascaraTelefone(p.telefone)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.tipo === 'Paciente' ? 'bg-green-100 text-green-700' : 
                      p.tipo === 'Medico' ? 'bg-purple-100 text-purple-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                      onClick={() => abrirEdicao(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
                      onClick={() => abrirModalExclusao(p.id, p.nome)}
                    >
                      Excluir
                    </button>
                    {(isAdmin || isEnfermeira) && p.usuarioId && (
                      <button
                        className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                        onClick={() => setPacienteReset({ id: p.id, usuarioId: p.usuarioId!, nome: p.nome })}
                      >
                        Redefinir Senha
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

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
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
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
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
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
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
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
    </>
  );
}
