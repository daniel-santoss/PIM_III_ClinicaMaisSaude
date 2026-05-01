import { useState } from "react";
import { isCpfValido, isEmailValido, mascaraCpf } from "../utils/validators";

export default function Login({ onLogado }: { onLogado: () => void }) {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [isCpfMask, setIsCpfMask] = useState(false);

  const handleIdentificador = (valor: string) => {
    if (/[a-zA-Z@]/.test(valor)) {
      setIsCpfMask(false);
      setIdentificador(valor);
      return;
    }

    setIsCpfMask(true);
    setIdentificador(mascaraCpf(valor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    const treatAsEmail = /[a-zA-Z@]/.test(identificador);
    if (treatAsEmail) {
      if (!isEmailValido(identificador)) {
        setErro("Formato de e-mail inválido.");
        setCarregando(false);
        return;
      }
    } else {
      if (!isCpfValido(identificador)) {
        setErro("O CPF informado é inválido.");
        setCarregando(false);
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:5045/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, senha })
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas");
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("tipoUsuario", data.tipoUsuario);
      localStorage.setItem("isAdmin", data.isAdmin ? "true" : "false");
      if (data.pacienteId) localStorage.setItem("pacienteId", data.pacienteId);
      if (data.profissionalId) localStorage.setItem("profissionalId", data.profissionalId);
      onLogado();

    } catch (err: any) {
      setErro(err.message || "Erro de conexão ao servidor");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-blue-900">
          Clínica Mais Saúde
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Faça login para acessar sua conta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-mail ou CPF
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={identificador}
                  onChange={(e) => handleIdentificador(e.target.value)}
                  maxLength={isCpfMask ? 14 : 255}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>

            {erro && (
              <div className="text-red-600 text-sm font-medium">{erro}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
