import { useState } from "react";
import type { FormEvent } from "react";

export function CadastroUsuario() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("Paciente");
  const [crm, setCrm] = useState("");
  const [ufCrm, setUfCrm] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem(null);

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch("http://localhost:5045/api/LoginPortal/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome,
          email,
          cpf,
          senha,
          tipoUsuario,
          crm: tipoUsuario === "Medico" ? crm : null,
          ufCrm: tipoUsuario === "Medico" ? ufCrm : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMensagem({ texto: errorText || "Erro ao realizar cadastro.", erro: true });
      } else {
        setMensagem({ texto: "Usuário cadastrado com sucesso!", erro: false });
        // Limpa formulário
        setNome("");
        setEmail("");
        setCpf("");
        setSenha("");
        setCrm("");
        setUfCrm("");
      }
    } catch (err) {
      setMensagem({ texto: "Falha de conexão com o servidor.", erro: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow border border-gray-100">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Cadastro de Usuários</h2>
        <p className="text-sm text-gray-500 mt-1">Acesso restrito: Administradores</p>
      </div>

      {mensagem && (
        <div className={`p-4 rounded mb-6 ${mensagem.erro ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Digite o nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="exemplo@email.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
            <input
              type="text"
              required
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha (Provisória) *</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="******"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Perfil *</label>
          <select
            value={tipoUsuario}
            onChange={(e) => setTipoUsuario(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Paciente">Paciente</option>
            <option value="Enfermeira">Enfermeira</option>
            <option value="Medico">Médico</option>
          </select>
        </div>

        {tipoUsuario === "Medico" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50 p-4 rounded border border-blue-100">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">CRM (6 dígitos numéricos) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className="w-full border border-blue-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">UF do CRM *</label>
              <select
                required
                value={ufCrm}
                onChange={(e) => setUfCrm(e.target.value)}
                className="w-full border border-blue-300 rounded p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecione...</option>
                <option value="SP">SP</option>
                <option value="RJ">RJ</option>
                <option value="MG">MG</option>
                <option value="RS">RS</option>
                <option value="PR">PR</option>
                {/* Outras UFs podem ser adicionadas */}
              </select>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded transition-colors ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow"}`}
          >
            {loading ? "Cadastrando..." : "Registrar Usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}
