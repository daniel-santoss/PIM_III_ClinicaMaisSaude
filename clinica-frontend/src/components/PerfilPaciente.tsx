import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { Pencil } from "lucide-react";
import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";
import AvatarUpload from "./AvatarUpload";
import { storageKeys } from "../constants/storage";

export default function PerfilPaciente() {
  const [paciente, setPaciente] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(localStorage.getItem(storageKeys.fotoBase64));
  const toast = useToast();

  const [editMode, setEditMode] = useState(false);
  const [editSenha, setEditSenha] = useState(false);
  const [editData, setEditData] = useState<any>({
    nome: "",
    telefone: "",
    email: "",
    temProblemaMemoria: false,
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });
  const [salvando, setSalvando] = useState(false);

  const pacienteId = localStorage.getItem(storageKeys.pacienteId);
  const token = localStorage.getItem(storageKeys.authToken);

  useScrollBlock(!!(modalExcluir || editMode || editSenha));

  const carregarDados = async () => {
    try {
      const res = await fetch(`${API_URL}/api/Pacientes/${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        setPaciente(dados);
        if (dados.fotoBase64) {
          setFotoBase64(dados.fotoBase64);
          localStorage.setItem(storageKeys.fotoBase64, dados.fotoBase64);
        }
        setEditData({
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email,
          temProblemaMemoria: dados.temProblemaMemoria || false,
          senhaAtual: "",
          novaSenha: "",
          confirmarSenha: ""
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (pacienteId) carregarDados();
  }, [pacienteId, token]);

  const salvarTudo = async () => {
    setSalvando(true);
    try {
      // 1. Salvar Perfil
      const resPerfil = await fetch(`${API_URL}/api/Pacientes/${pacienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: editData.nome,
          cpf: paciente.cpf,
          telefone: editData.telefone,
          email: editData.email,
          temProblemaMemoria: editData.temProblemaMemoria
        })
      });

      if (!resPerfil.ok) {
        toast.error(await resPerfil.text() || "Erro ao salvar perfil.");
        setSalvando(false);
        return;
      }

      // 2. Salvar Senha if enabled
      if (editSenha) {
        if (!editData.novaSenha || !editData.senhaAtual || !editData.confirmarSenha) {
          toast.warning("Preencha todos os campos de senha.");
          setSalvando(false);
          return;
        }
        if (editData.novaSenha !== editData.confirmarSenha) {
          toast.error("As senhas não coincidem.");
          setSalvando(false);
          return;
        }

        const resSenha = await fetch(`${API_URL}/api/Perfil/senha`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ senhaAtual: editData.senhaAtual, novaSenha: editData.novaSenha })
        });

        if (!resSenha.ok) {
          toast.error(await resSenha.text());
          setSalvando(false);
          return;
        }
      }

      setPaciente({ ...paciente, ...editData });
      setEditMode(false);
      setEditSenha(false);
      toast.success("Perfil atualizado com sucesso!");
      carregarDados();
    } catch (e) {
      toast.error("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    setEditMode(false);
    setEditSenha(false);
    setEditData({
      nome: paciente.nome,
      telefone: paciente.telefone,
      email: paciente.email,
      temProblemaMemoria: paciente.temProblemaMemoria || false,
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: ""
    });
  };

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto px-4 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-6">
        <AvatarUpload
          fotoBase64={fotoBase64}
          iniciais={paciente?.nome?.charAt(0).toUpperCase() ?? "?"}
          size={80}
          onFotoAtualizada={(base64) => {
            setFotoBase64(base64);
            window.dispatchEvent(new CustomEvent("fotoPerfilAtualizada", { detail: base64 }));
          }}
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Meu Perfil</h1>
          <p className="text-gray-400 text-sm font-medium">Informações da conta</p>
        </div>
      </div>

      {/* Seção de Dados */}
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2">
          {/* NOME */}
          <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b md:border-b-0 md:border-r border-gray-50">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome Completo</span>
              {editMode ? (
                <input 
                  type="text" 
                  value={editData.nome} 
                  onChange={e => setEditData({...editData, nome: e.target.value})}
                  className="text-sm font-bold text-gray-800 bg-transparent border-b border-purple-200 outline-none focus:border-[#7C3AED] py-1"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800">{paciente?.nome}</span>
              )}
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="p-2 text-gray-300 hover:text-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100">
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* EMAIL */}
          <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b md:border-b-0 border-gray-50">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">E-mail</span>
              {editMode ? (
                <input 
                  type="email" 
                  value={editData.email} 
                  onChange={e => setEditData({...editData, email: e.target.value})}
                  className="text-sm font-bold text-gray-800 bg-transparent border-b border-purple-200 outline-none focus:border-[#7C3AED] py-1"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800">{paciente?.email}</span>
              )}
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="p-2 text-gray-300 hover:text-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100">
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* TELEFONE */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50 transition-colors group md:border-r">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</span>
              {editMode ? (
                <input 
                  type="text" 
                  value={editData.telefone} 
                  onChange={e => setEditData({...editData, telefone: mascaraTelefone(e.target.value)})}
                  className="text-sm font-bold text-gray-800 bg-transparent border-b border-purple-200 outline-none focus:border-[#7C3AED] py-1"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800">{mascaraTelefone(paciente?.telefone)}</span>
              )}
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="p-2 text-gray-300 hover:text-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100">
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* CPF  */}
          <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 bg-gray-50/30">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPF</span>
            <span className="text-sm font-bold text-gray-500">{mascaraCpf(paciente?.cpf)}</span>
          </div>

          {/* PROBLEMA MEMÓRIA */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-white md:border-r group transition-colors hover:bg-gray-50">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Problema de memória?</span>
              {editMode ? (
                <input type="checkbox" checked={editData.temProblemaMemoria} onChange={e => setEditData({...editData, temProblemaMemoria: e.target.checked})} className="w-5 h-5 text-[#7C3AED] rounded border-gray-300 focus:ring-[#7C3AED] focus:ring-2 outline-none cursor-pointer mt-1" />
              ) : (
                <span className="text-sm font-bold text-gray-800">{paciente?.temProblemaMemoria ? "Sim" : "Não"}</span>
              )}
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="p-2 text-gray-300 hover:text-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100">
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* SENHA */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50 transition-colors group">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Senha</span>
              <span className="text-sm font-bold text-gray-800 tracking-[0.3em]">••••••••</span>
            </div>
            {!editSenha && (
              <button 
                onClick={() => { setEditMode(true); setEditSenha(true); }} 
                className="p-2 text-gray-300 hover:text-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* Campos de nova senha */}
          {editSenha && (
            <div className="col-span-1 md:col-span-2 px-6 py-6 bg-purple-50/30 border-t border-purple-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Senha Atual</label>
                  <input 
                    type="password" 
                    placeholder="Sua senha atual"
                    value={editData.senhaAtual}
                    onChange={e => setEditData({...editData, senhaAtual: e.target.value})}
                    className="w-full p-3 bg-white border border-purple-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400 font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Nova senha"
                    value={editData.novaSenha}
                    onChange={e => setEditData({...editData, novaSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-purple-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400 font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Confirme a nova senha"
                    value={editData.confirmarSenha}
                    onChange={e => setEditData({...editData, confirmarSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-purple-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400 font-bold"
                  />
                </div>

                {/* Botões de Ação ao lado de Confirmar Senha */}
                <div className="flex items-end justify-end gap-3 pb-1">
                  <button 
                    onClick={cancelarEdicao}
                    className="px-8 py-3 border border-gray-300 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors bg-white shadow-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={salvarTudo}
                    disabled={salvando}
                    className="px-10 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#6D28D9] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {salvando ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
                    ) : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação (Salvar / Cancelar) - Apenas se não estiver editando senha */}
        {editMode && !editSenha && (
          <div className="flex justify-end gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
            <button 
              onClick={cancelarEdicao}
              className="px-8 py-3 border border-gray-300 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={salvarTudo}
              disabled={salvando}
              className="px-10 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#6D28D9] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
            >
              {salvando ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
              ) : "Salvar"}
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] font-bold text-gray-400 text-center px-6 py-8 leading-relaxed italic uppercase tracking-wider">
        O seu CPF só pode ser alterado presencialmente na recepção mediante a apresentação de um documento com foto.
      </p>

      <div className="mt-4 pt-6 border-t border-gray-50 flex justify-center">
        <button
          onClick={() => setModalExcluir(true)}
          className="text-[10px] font-black text-red-300 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
        >
          Excluir minha conta
        </button>
      </div>

      {/* MODAL: EXCLUIR CONTA (SIMPLIFICADO) */}
      {modalExcluir && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-red-900/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 text-center animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Apagar conta?</h3>
            <p className="text-gray-400 text-xs mb-8">Esta ação removerá todos os seus dados e não pode ser desfeita.</p>
            <div className="flex flex-col gap-2">
              <button disabled title="Funcionalidade em desenvolvimento" className="w-full py-3.5 bg-red-300 text-white font-bold rounded-xl text-xs uppercase cursor-not-allowed opacity-60">Confirmar (em breve)</button>
              <button onClick={() => setModalExcluir(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
