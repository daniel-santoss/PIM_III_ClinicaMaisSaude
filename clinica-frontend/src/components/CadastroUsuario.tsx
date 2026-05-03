import { API_URL } from "../constants/api";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { mascaraCpf } from "../utils/validators";
import { ChevronDown, Check } from 'lucide-react';

interface UsuarioInfo {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  tipoUsuario: string;
}

export function CadastroUsuario({ onUserCreated }: { onUserCreated?: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("Paciente");
  const [crm, setCrm] = useState("");
  const [ufCrm, setUfCrm] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const opcoesPerfil = [
    { id: 'Paciente', nome: 'Paciente' },
    { id: 'Enfermeira', nome: 'Enfermeira' },
    { id: 'Medico', nome: 'Médico' },
  ];



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem(null);

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${API_URL}/api/LoginPortal/cadastro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
        setUfCrm("");
        if (onUserCreated) onUserCreated();
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
        <p className="text-sm text-gray-500 mt-1">Acesso restrito</p>
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
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all"
              placeholder="Digite o nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all"
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
              maxLength={14}
              value={cpf}
              onChange={(e) => setCpf(mascaraCpf(e.target.value))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all"
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
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all"
              placeholder="******"
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Tipo de Perfil *</label>
          <button
            type="button"
            onClick={() => setDropdownAberto(!dropdownAberto)}
            className="w-full flex items-center justify-between border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all text-left shadow-sm"
          >
            <span className="font-bold text-sm text-gray-700">
              {opcoesPerfil.find(o => o.id === tipoUsuario)?.nome}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
          </button>

          {dropdownAberto && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownAberto(false)}
              ></div>
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {opcoesPerfil.map((opcao) => (
                  <div
                    key={opcao.id}
                    onClick={() => {
                      setTipoUsuario(opcao.id);
                      setDropdownAberto(false);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${
                      tipoUsuario === opcao.id 
                        ? 'bg-[#7C3AED] text-white' 
                        : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span className="font-bold text-sm">{opcao.nome}</span>
                    {tipoUsuario === opcao.id && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {tipoUsuario === "Medico" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">CRM (6 dígitos numéricos) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className="w-full border border-purple-200 rounded-xl p-3 focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all"
                placeholder="Ex: 123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">UF do CRM *</label>
              <select
                required
                value={ufCrm}
                onChange={(e) => setUfCrm(e.target.value)}
                className="w-full border border-purple-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-all cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-black uppercase tracking-wider py-3 rounded-xl transition-all ${loading ? "bg-purple-300 cursor-not-allowed" : "bg-[#7C3AED] hover:bg-[#6D28D9] hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-purple-200"}`}
          >
            {loading ? "Processando..." : "Registrar Usuário"}
          </button>
        </div>
      </form>


    </div>
  );
}
