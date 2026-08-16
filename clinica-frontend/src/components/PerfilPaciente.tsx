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
        <div className="w-8 h-8 border-2 border-line border-t-[#2C5282] rounded-full animate-spin"></div>
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
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-ink leading-none">Meu Perfil</h1>
          <p className="text-muted text-sm">Informações da conta</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-md border border-brand-600 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors shrink-0"
          >
            <Pencil size={15} /> Editar
          </button>
        )}
      </div>

      {/* Seção de Dados */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-line overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* NOME */}
          <div className="px-6 py-4 flex items-center justify-between hover:bg-canvas transition-colors group border-b md:border-b-0 md:border-r border-line">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Nome Completo</span>
              {editMode ? (
                <input 
                  type="text" 
                  value={editData.nome} 
                  onChange={e => setEditData({...editData, nome: e.target.value})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{paciente?.nome}</span>
              )}
            </div>
          </div>

          {/* EMAIL */}
          <div className="px-6 py-4 flex items-center justify-between hover:bg-canvas transition-colors group border-b md:border-b-0 border-line">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">E-mail</span>
              {editMode ? (
                <input 
                  type="email" 
                  value={editData.email} 
                  onChange={e => setEditData({...editData, email: e.target.value})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{paciente?.email}</span>
              )}
            </div>
          </div>

          {/* TELEFONE */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-line hover:bg-canvas transition-colors group md:border-r">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Telefone</span>
              {editMode ? (
                <input 
                  type="text" 
                  value={editData.telefone} 
                  onChange={e => setEditData({...editData, telefone: mascaraTelefone(e.target.value)})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{mascaraTelefone(paciente?.telefone)}</span>
              )}
            </div>
          </div>

          {/* CPF  */}
          <div className="px-6 py-4 flex flex-col gap-1 border-t border-line bg-canvas">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">CPF</span>
            <span className="text-sm font-bold text-muted">{mascaraCpf(paciente?.cpf)}</span>
          </div>

          {/* PROBLEMA MEMÓRIA */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-line bg-white md:border-r group transition-colors hover:bg-canvas">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Problema de memória?</span>
              {editMode ? (
                <input type="checkbox" checked={editData.temProblemaMemoria} onChange={e => setEditData({...editData, temProblemaMemoria: e.target.checked})} className="w-5 h-5 text-[#2C5282] rounded border-gray-300 focus:ring-[#2C5282] focus:ring-2 outline-none cursor-pointer mt-1" />
              ) : (
                <span className="text-sm font-semibold text-ink">{paciente?.temProblemaMemoria ? "Sim" : "Não"}</span>
              )}
            </div>
          </div>

          {/* SENHA */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-line hover:bg-canvas transition-colors group">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Senha</span>
              <span className="text-sm font-semibold text-ink tracking-[0.3em]">••••••••</span>
            </div>
            {editMode && !editSenha && (
              <button
                onClick={() => setEditSenha(true)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#2C5282] bg-brand-50 hover:bg-brand-50 transition-colors"
              >
                Alterar
              </button>
            )}
          </div>

          {/* Campos de nova senha */}
          {editSenha && (
            <div className="col-span-1 md:col-span-2 px-6 py-6 bg-canvas border-t border-line space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Senha Atual</label>
                  <input 
                    type="password" 
                    placeholder="Sua senha atual"
                    value={editData.senhaAtual}
                    onChange={e => setEditData({...editData, senhaAtual: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Nova senha"
                    value={editData.novaSenha}
                    onChange={e => setEditData({...editData, novaSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Confirme a nova senha"
                    value={editData.confirmarSenha}
                    onChange={e => setEditData({...editData, confirmarSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                {/* Botões de Ação ao lado de Confirmar Senha */}
                <div className="flex items-end justify-end gap-3 pb-1">
                  <button 
                    onClick={cancelarEdicao}
                    className="px-8 py-3 border border-gray-300 text-muted rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-canvas transition-colors bg-white shadow-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={salvarTudo}
                    disabled={salvando}
                    className="px-10 py-3 bg-[#2C5282] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#152D5C] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
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
              className="px-8 py-3 border border-gray-300 text-muted rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-canvas transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={salvarTudo}
              disabled={salvando}
              className="px-10 py-3 bg-[#2C5282] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#152D5C] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
            >
              {salvando ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
              ) : "Salvar"}
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] font-bold text-muted text-center px-6 py-8 leading-relaxed italic uppercase tracking-wider">
        O seu CPF só pode ser alterado presencialmente na recepção mediante a apresentação de um documento com foto.
      </p>

      <div className="mt-4 pt-6 border-t border-line flex justify-center">
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xs p-8 text-center animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-ink mb-2">Apagar conta?</h3>
            <p className="text-muted text-xs mb-8">Esta ação removerá todos os seus dados e não pode ser desfeita.</p>
            <div className="flex flex-col gap-2">
              <button disabled title="Funcionalidade em desenvolvimento" className="w-full py-3.5 bg-red-300 text-white font-bold rounded-xl text-xs uppercase cursor-not-allowed opacity-60">Confirmar (em breve)</button>
              <button onClick={() => setModalExcluir(false)} className="w-full py-3 text-muted font-bold text-xs uppercase">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
