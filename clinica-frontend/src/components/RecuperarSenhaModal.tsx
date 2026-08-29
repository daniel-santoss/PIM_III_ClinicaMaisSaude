import { useState } from "react";
import { createPortal } from "react-dom";
import { API_URL } from "../constants/api";
import { mascaraCpf } from "../utils/validators";
import { X, Lock, KeyRound, ShieldCheck, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

/** Alfabeto do código (espelha o backend: sem caracteres ambíguos). */
const ALFABETO_CODIGO = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const SENHA_MIN = 8;

type Passo = "identificador" | "codigo" | "senha" | "sucesso";

export default function RecuperarSenhaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [passo, setPasso] = useState<Passo>("identificador");
  const [identificador, setIdentificador] = useState("");
  const [isCpfMask, setIsCpfMask] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  if (!open) return null;

  const fechar = () => {
    // Reseta tudo ao fechar para não vazar estado entre aberturas.
    setPasso("identificador");
    setIdentificador(""); setIsCpfMask(false); setCodigo(""); setResetToken("");
    setSenha(""); setConfirmar(""); setMostrarSenha(false); setErro(""); setCarregando(false);
    onClose();
  };

  const handleIdentificador = (valor: string) => {
    if (/[a-zA-Z@]/.test(valor)) {
      setIsCpfMask(false);
      setIdentificador(valor);
    } else {
      setIsCpfMask(true);
      setIdentificador(mascaraCpf(valor));
    }
  };

  const handleCodigo = (valor: string) => {
    const limpo = (valor.toUpperCase().match(ALFABETO_CODIGO) || []).join("").slice(0, 6);
    setCodigo(limpo);
  };

  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim()) return;
    setErro(""); setCarregando(true);
    try {
      await fetch(`${API_URL}/api/Auth/recuperar-senha/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: identificador.trim() }),
      });
      // Resposta é sempre genérica (anti-enumeração): avançamos independente do resultado.
      setPasso("codigo");
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const validar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.length !== 6) { setErro("Digite os 6 caracteres do código."); return; }
    setErro(""); setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/Auth/recuperar-senha/validar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: identificador.trim(), codigo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Código inválido ou expirado.");
      }
      const data = await res.json();
      setResetToken(data.resetToken);
      setPasso("senha");
    } catch (err: any) {
      setErro(err.message || "Código inválido ou expirado.");
    } finally {
      setCarregando(false);
    }
  };

  const redefinir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) { setErro(`A senha deve ter ao menos ${SENHA_MIN} caracteres.`); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    setErro(""); setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/Auth/recuperar-senha/redefinir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, novaSenha: senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Não foi possível redefinir a senha.");
      }
      setPasso("sucesso");
    } catch (err: any) {
      setErro(err.message || "Não foi possível redefinir a senha.");
    } finally {
      setCarregando(false);
    }
  };

  const iconePorPasso = {
    identificador: <KeyRound className="w-8 h-8" />,
    codigo: <ShieldCheck className="w-8 h-8" />,
    senha: <Lock className="w-8 h-8" />,
    sucesso: <CheckCircle2 className="w-8 h-8" />,
  }[passo];

  const tituloPorPasso = {
    identificador: "Recuperar senha",
    codigo: "Digite o código",
    senha: "Nova senha",
    sucesso: "Senha redefinida",
  }[passo];

  const btn =
    "w-full bg-[#2C5282] text-white font-black py-3.5 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg shadow-purple-100 hover:bg-[#152D5C] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2";
  const inputCls =
    "w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5282] focus:border-transparent transition-all text-sm font-medium bg-gray-50 focus:bg-white";

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={fechar}>
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50 relative max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={fechar}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-[#EBF8FF] text-[#2C5282] rounded-2xl flex items-center justify-center mx-auto mb-4">
          {iconePorPasso}
        </div>
        <h3 className="text-xl font-black text-gray-800 mb-1 uppercase tracking-tight">{tituloPorPasso}</h3>

        {/* Passo 1 — identificador */}
        {passo === "identificador" && (
          <form onSubmit={solicitar} className="mt-5 space-y-4 text-left">
            <p className="text-sm font-medium text-gray-500 text-center">
              Informe seu CPF ou e-mail. Se a conta existir, enviaremos um código para o e-mail cadastrado.
            </p>
            <input
              type="text"
              autoFocus
              placeholder="CPF ou e-mail"
              className={inputCls}
              value={identificador}
              onChange={(e) => handleIdentificador(e.target.value)}
              maxLength={isCpfMask ? 14 : 255}
            />
            {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
            <button type="submit" disabled={carregando || !identificador.trim()} className={btn}>
              {carregando ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        )}

        {/* Passo 2 — código */}
        {passo === "codigo" && (
          <form onSubmit={validar} className="mt-5 space-y-4 text-left">
            <p className="text-sm font-medium text-gray-500 text-center">
              Enviamos um código de 6 caracteres para o e-mail cadastrado. Ele expira em 15 minutos.
            </p>
            <input
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              placeholder="ABC123"
              className={`${inputCls} text-center text-2xl font-black tracking-[0.5em] uppercase`}
              value={codigo}
              onChange={(e) => handleCodigo(e.target.value)}
              maxLength={6}
            />
            {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
            <button type="submit" disabled={carregando || codigo.length !== 6} className={btn}>
              {carregando ? "Validando..." : "Validar código"}
            </button>
            <button
              type="button"
              onClick={() => { setPasso("identificador"); setErro(""); setCodigo(""); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#2C5282] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </form>
        )}

        {/* Passo 3 — nova senha */}
        {passo === "senha" && (
          <form onSubmit={redefinir} className="mt-5 space-y-4 text-left">
            <p className="text-sm font-medium text-gray-500 text-center">
              Defina sua nova senha (mínimo {SENHA_MIN} caracteres).
            </p>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                autoFocus
                placeholder="Nova senha"
                className={`${inputCls} pr-12`}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-[#2C5282]"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Confirmar nova senha"
              className={inputCls}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
            {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
            <button type="submit" disabled={carregando} className={btn}>
              {carregando ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}

        {/* Passo 4 — sucesso */}
        {passo === "sucesso" && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6">
              Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.
            </p>
            <button onClick={fechar} className={btn}>Entrar</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
