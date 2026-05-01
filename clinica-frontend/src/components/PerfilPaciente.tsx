import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";

export default function PerfilPaciente() {
  const [paciente, setPaciente] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalSenha, setModalSenha] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modalMensagem, setModalMensagem] = useState<string | null>(null);
  
  const pacienteId = localStorage.getItem("pacienteId");
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const res = await fetch(`http://localhost:5045/api/Pacientes/${pacienteId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const dados = await res.json();
          setPaciente(dados);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [pacienteId, token]);

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
      </div>
    );
  }

  const alterarSenha = async () => {
    if (novaSenha !== confirmarSenha) return setModalMensagem("As senhas não coincidem.");
    // A real validação está sendo feita no backend
    if (senhaAtual === novaSenha) return setModalMensagem("A nova senha não pode ser igual a senha atual!");
    if (!novaSenha || !senhaAtual) return setModalMensagem("Preencha todos os campos.");
    
    try {
      const res = await fetch("http://localhost:5045/api/Perfil/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });
      
      if (res.ok) {
        setModalMensagem("Senha alterada com sucesso!");
        setModalSenha(false);
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      } else {
        setModalMensagem(await res.text());
      }
    } catch (e) { setModalMensagem("Erro de conexão."); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 w-full px-4">
      {/* Perfil Header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-purple-100 text-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
          {paciente?.nome?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{paciente?.nome}</h1>
        <p className="text-gray-400 text-sm font-medium">Informações da conta</p>
        {/* MODAL MENSAGEM */}
      {modalMensagem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Aviso</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{modalMensagem}</p>
            <button className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100" onClick={() => setModalMensagem(null)}>Entendido</button>
          </div>
        </div>
      )}
      </div>

{/* Lista de Dados Simples */}
      <div className="space-y-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 flex flex-col gap-1 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome Completo</span>
          <span className="text-sm font-bold text-gray-800">{paciente?.nome}</span>
        </div>
        <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPF</span>
          <span className="text-sm font-bold text-gray-800">{mascaraCpf(paciente?.cpf)}</span>
        </div>
        <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</span>
          <span className="text-sm font-bold text-gray-800">{mascaraTelefone(paciente?.telefone)}</span>
        </div>
        <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">E-mail</span>
          <span className="text-sm font-bold text-gray-800">{paciente?.email}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="mt-10 space-y-3">
        <button 
          onClick={() => setModalSenha(true)}
          className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-bold text-sm hover:bg-[#6D28D9] transition-all shadow-md active:scale-[0.98]"
        >
          Alterar Senha
        </button>
        
        <p className="text-sm font-bold text-gray-400 text-center px-6 py-4 leading-relaxed italic">
          Dados cadastrais só podem ser alterados presencialmente na recepção mediante a apresentação de um documento com foto.
        </p>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-50 flex justify-center">
        <button 
          onClick={() => setModalExcluir(true)}
          className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
        >
          Excluir minha conta
        </button>
      </div>

      {/* MODAL: ALTERAR SENHA (SIMPLIFICADO) */}
      {modalSenha && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Nova Senha</h3>
            <div className="space-y-3">
              <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" placeholder="Senha atual" />
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" placeholder="Nova senha" />
              <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" placeholder="Confirme a nova senha" />
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setModalSenha(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
              <button onClick={alterarSenha} className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-purple-100 hover:bg-[#6D28D9] transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR CONTA (SIMPLIFICADO) */}
      {modalExcluir && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-red-900/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 text-center animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Apagar conta?</h3>
            <p className="text-gray-400 text-xs mb-8">Esta ação removerá todos os seus dados e não pode ser desfeita.</p>
            <div className="flex flex-col gap-2">
              <button className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-red-100">Confirmar</button>
              <button onClick={() => setModalExcluir(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
