import { useState } from "react";
import { isCpfValido, isEmailValido, mascaraCpf } from "../utils/validators";
import logoPng from "../assets/logo_clinica.png";
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function Login({ onLogado }: { onLogado: () => void }) {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modalEsqueciSenha, setModalEsqueciSenha] = useState(false);

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        <div className="text-center mb-8">
          {/* Logo PNG */}
          <img
            src={logoPng}
            alt="Logo Clínica Mais Saúde"
            className="h-20 mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl md:text-3xl font-black text-[#7C3AED] tracking-tight">
            Clínica Mais Saúde
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Faça login para acessar sua conta
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
              E-mail ou CPF
            </label>
            <input
              type="text"
              required
              placeholder="Digite seu e-mail ou CPF"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all text-sm font-medium bg-gray-50 focus:bg-white"
              value={identificador}
              onChange={(e) => handleIdentificador(e.target.value)}
              maxLength={isCpfMask ? 14 : 255}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all text-sm font-medium bg-gray-50 focus:bg-white pr-12"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-[#7C3AED] transition-colors"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg border border-red-100">
              {erro}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-purple-200 text-sm font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setModalEsqueciSenha(true)}
              className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] underline underline-offset-4 transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>
      </div>

      {/* Modal Esqueci a Senha */}
      {modalEsqueciSenha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-4 uppercase tracking-tight">Recuperar Senha</h3>

            <div className="text-left bg-gray-50 p-4 rounded-xl mb-6 space-y-3 border border-gray-100">
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-1">Se você é Paciente:</span>
                <p className="text-sm font-medium text-gray-600">Ligue para a recepção no número <br /><strong className="text-gray-800">(11) 99999-9999</strong>.</p>
              </div>
              <div className="h-px bg-gray-200 w-full"></div>
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-1">Se você é Funcionário:</span>
                <p className="text-sm font-medium text-gray-600">Entre em contato com o administrador do sistema o mais rápido possível.</p>
              </div>
            </div>

            <button className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100 hover:bg-[#6D28D9] transition-all active:scale-95" onClick={() => setModalEsqueciSenha(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
