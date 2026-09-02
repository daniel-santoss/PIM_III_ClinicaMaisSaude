import { API_URL, ADMIN_EMAIL, CLINIC_NAME } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { useState } from "react";
import { useScrollBlock } from "../hooks/useScrollBlock";
import { isCpfValido, isEmailValido, mascaraCpf } from "../utils/validators";
import logoPng from "../assets/logo_clinica.png";
import bgImage from "../assets/itens_medicos_background.png";
import { Eye, EyeOff, ArrowLeft, ShieldAlert, X } from 'lucide-react';
import { useToast } from "../hooks/useToast";
import RecuperarSenhaModal from "../components/RecuperarSenhaModal";
import AutoCadastro from "./AutoCadastro";

export default function Login({ onLogado }: { onLogado: () => void }) {
  // Usuário lembrado: pré-preenche o identificador (e mantém o checkbox marcado).
  const lembrarInicial = localStorage.getItem(storageKeys.lembrarUsuario) !== "0";
  const identificadorSalvo = lembrarInicial ? (localStorage.getItem(storageKeys.contaIdentificador) ?? "") : "";
  const [identificador, setIdentificador] = useState(identificadorSalvo);
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(lembrarInicial);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modalEsqueciSenha, setModalEsqueciSenha] = useState(false);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  // Se o identificador salvo é um CPF (sem letras/@), já entra em modo máscara.
  const [isCpfMask, setIsCpfMask] = useState(!!identificadorSalvo && !/[a-zA-Z@]/.test(identificadorSalvo));
  const [modalPenalidadeRemovida, setModalPenalidadeRemovida] = useState(false);
  const [violacaoDetectada, setViolacaoDetectada] = useState(() => localStorage.getItem(storageKeys.violacaoDetectada) === "true");
  const toast = useToast();

  useScrollBlock(modalEsqueciSenha || modalPenalidadeRemovida || violacaoDetectada);

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
        toast.error("Formato de e-mail inválido.");
        setCarregando(false);
        return;
      }
    } else {
      if (!isCpfValido(identificador)) {
        toast.error("O CPF informado é inválido.");
        setCarregando(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, senha })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Credenciais inválidas");
      }

      const data = await response.json();
      // Preferência "Lembrar usuário": guarda o identificador para o próximo login.
      if (lembrar) {
        localStorage.setItem(storageKeys.lembrarUsuario, "1");
        localStorage.setItem(storageKeys.contaIdentificador, identificador);
      } else {
        localStorage.setItem(storageKeys.lembrarUsuario, "0");
        localStorage.removeItem(storageKeys.contaIdentificador);
      }
      localStorage.setItem(storageKeys.authToken, data.token);
      if (data.refreshToken) localStorage.setItem(storageKeys.refreshToken, data.refreshToken);
      localStorage.setItem(storageKeys.tipoUsuario, data.tipoUsuario);
      localStorage.setItem(storageKeys.isAdmin, data.isAdmin ? "true" : "false");
      if (data.pacienteId) localStorage.setItem(storageKeys.pacienteId, data.pacienteId);
      if (data.profissionalId) localStorage.setItem(storageKeys.profissionalId, data.profissionalId);
      const nomeSalvar = data.nome || data.Nome;
      if (nomeSalvar) localStorage.setItem(storageKeys.nomeUsuario, nomeSalvar);
      if (data.fotoBase64) localStorage.setItem(storageKeys.fotoBase64, data.fotoBase64);

      if (data.penalidadeRemovida) {
        // Exibe modal antes de entrar; onLogado() será chamado ao fechar
        setModalPenalidadeRemovida(true);
      } else {
        onLogado();
      }

    } catch (err: any) {
      if (err.message && err.message.startsWith("PERMANENT_BAN:")) {
        setErro(err.message);
      } else {
        toast.error(err.message || "Erro de conexão ao servidor");
      }
    } finally {
      setCarregando(false);
    }
  };

  // Auto-cadastro (self-service): substitui a tela de login enquanto ativo.
  if (mostrarCadastro) {
    return <AutoCadastro onVoltar={() => setMostrarCadastro(false)} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 bg-gray-50"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-2xl w-full max-w-md p-8 md:p-10 border border-gray-100/50 relative">
        <a 
          href="/" 
          className="absolute top-6 left-6 md:top-8 md:left-8 p-2 rounded-xl text-gray-400 hover:text-[#2C5282] hover:bg-purple-50 transition-all duration-200 group"
          title="Voltar para a Home"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
        </a>
        <div className="text-center mb-8">
          <img
            src={logoPng}
            alt={`Logo ${CLINIC_NAME}`}
            className="h-20 mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl md:text-3xl font-black text-[#2C5282] tracking-tight">
            {CLINIC_NAME}
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5282] focus:border-transparent transition-all text-sm font-medium bg-gray-50 focus:bg-white"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5282] focus:border-transparent transition-all text-sm font-medium bg-gray-50 focus:bg-white pr-12"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-[#2C5282] transition-colors"
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

          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#2C5282] focus:ring-[#2C5282] cursor-pointer accent-[#2C5282]"
            />
            <span className="text-xs font-bold text-gray-600">Lembrar usuário</span>
          </label>

          {erro && erro.startsWith("PERMANENT_BAN:") ? (
            <div className="text-red-700 text-xs font-bold text-center bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm flex flex-col items-center gap-2">
              <span className="text-sm">🚫 {erro.replace("PERMANENT_BAN:", "")}</span>
              <button 
                type="button" 
                onClick={() => window.location.href = `mailto:${ADMIN_EMAIL}?subject=Revisão de Banimento de Conta&body=Olá, gostaria de solicitar a revisão do banimento da minha conta.`}
                className="mt-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wider text-[10px]"
              >
                Se achar que isso é um erro, entre em contato
              </button>
            </div>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-purple-200 text-sm font-black text-white bg-[#2C5282] hover:bg-[#152D5C] focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {carregando ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
              ) : "Entrar"}
            </button>
          </div>

          <div className="text-center pt-4 flex flex-col gap-3 items-center">
            <button
              type="button"
              onClick={() => setModalEsqueciSenha(true)}
              className="text-xs font-bold text-[#2C5282] hover:text-[#152D5C] underline underline-offset-4 transition-colors"
            >
              Esqueci minha senha
            </button>
            <button
              type="button"
              onClick={() => setMostrarCadastro(true)}
              className="text-xs font-medium text-gray-500 hover:text-[#2C5282] transition-colors"
            >
              É novo por aqui? <span className="font-bold text-[#2C5282] underline underline-offset-4">Cadastre-se</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Esqueci a Senha — fluxo funcional de recuperação por código */}
      <RecuperarSenhaModal open={modalEsqueciSenha} onClose={() => setModalEsqueciSenha(false)} />

      {/* Modal: Penalidade de IA removida */}
      {modalPenalidadeRemovida && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-green-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center border-4 border-green-400 relative max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Botão Fechar X */}
            <button
              onClick={() => { setModalPenalidadeRemovida(false); onLogado(); }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center shadow-sm"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-green-700 mb-3 uppercase tracking-tight">Penalidade Removida</h3>
            <p className="text-gray-600 text-sm font-medium leading-relaxed mb-8">
              Após análise, o administrador do sistema <strong>removeu a penalidade</strong> aplicada à sua conta.
              Você já pode utilizar o assistente de triagem com Inteligência Artificial normalmente.
            </p>
            <button
              onClick={() => { setModalPenalidadeRemovida(false); onLogado(); }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-green-200 transition-colors active:scale-95"
            >
              Entendido, Entrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Violação de Segurança */}
      {violacaoDetectada && (
        <div className="fixed inset-0 z-[299] flex items-center justify-center bg-red-900/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-red-900/50 w-full max-w-xl p-10 text-center border-4 border-red-500 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="w-14 h-14" />
            </div>
            <h3 className="text-3xl font-black text-red-700 mb-4 uppercase tracking-tight">Violação de Segurança</h3>
            <div className="text-red-900 text-xs sm:text-sm mb-10 font-bold leading-relaxed text-left space-y-4">
              <p>
                Detectamos uma tentativa deliberada de obtenção de credenciais privadas e ativos de domínio por meio da Inteligência Artificial do sistema. Esta conduta configura Invasão de Dispositivo Informático, conforme o Art. 154-A do Código Penal (Lei 12.737/2012) e violação dos princípios de segurança e confidencialidade da Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD).
              </p>
              <p className="text-red-800 uppercase tracking-widest text-[10px] sm:text-xs">Informamos que:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sua conta foi permanentemente bloqueada.</li>
                <li>O log completo desta interação e evidências técnicas de acesso foram encaminhados ao Administrador do Sistema.</li>
                <li>O incidente foi formalmente registrado para medidas judiciais e administrativas cabíveis.</li>
              </ul>
            </div>
            <button 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-red-200 transition-colors cursor-pointer" 
              onClick={() => { 
                localStorage.removeItem(storageKeys.violacaoDetectada); 
                setViolacaoDetectada(false); 
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
