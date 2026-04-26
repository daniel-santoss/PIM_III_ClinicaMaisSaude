import { useEffect, useState } from "react";
import type { PacienteResponse } from "../types/PacienteResponse";

interface PacienteListProps {
  recarregarContador?: number;
}

interface PacienteEdicao {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function PacienteList({ recarregarContador = 0 }: PacienteListProps) {
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshInterno, setRefreshInterno] = useState(0);

  // Estado de busca
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaCpf, setBuscaCpf] = useState("");

  // Estado do modal de edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PacienteEdicao>({ nome: "", cpf: "", telefone: "", email: "" });
  const [salvando, setSalvando] = useState(false);

  // Estado do modal de exclusão
  const [excluindoPaciente, setExcluindoPaciente] = useState<{ id: string, nome: string } | null>(null);
  const [excluindoLoader, setExcluindoLoader] = useState(false);

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

  const abrirEdicao = (p: PacienteResponse) => {
    setEditandoId(p.id);
    setForm({ nome: p.nome, cpf: p.cpf, telefone: p.telefone, email: p.email });
  };

  const fecharModal = () => {
    setEditandoId(null);
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
      </div>

      {carregando ? (
        <p className="text-center text-gray-500 py-8">Carregando pacientes…</p>
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
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {pacientes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Nenhum paciente cadastrado.
                </td>
              </tr>
            ) : (
              pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{p.cpf}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefone}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
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
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
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
    </>
  );
}
