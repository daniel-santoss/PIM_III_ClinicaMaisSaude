import { API_URL } from "../constants/api";
import { useEffect, useState } from "react";
import { ESPECIALIDADES } from "../constants/especialidades";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { X, Pencil } from 'lucide-react';
import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";
import AvatarUpload from "./AvatarUpload";
import { storageKeys } from "../constants/storage";
import { perfis } from "../constants/perfis";

export default function PerfilMedico() {
  const [medico, setMedico] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [especialidades, setEspecialidades] = useState<{ id: number, nome: string }[]>([]);
  const [focado, setFocado] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(localStorage.getItem(storageKeys.fotoBase64));

  const [editMode, setEditMode] = useState(false);
  const [editSenha, setEditSenha] = useState(false);
  const [formEdit, setFormEdit] = useState({
    nome: "",
    email: "",
    telefone: "",
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const toast = useToast();

  const profissionalId = localStorage.getItem(storageKeys.profissionalId);
  const token = localStorage.getItem(storageKeys.authToken);
  const isEnfermeira = localStorage.getItem(storageKeys.tipoUsuario) === perfis.enfermeira;
  // Admin não é profissional de atendimento: não tem especialidades.
  const isAdmin = localStorage.getItem(storageKeys.tipoUsuario) === perfis.admin;
  const temEspecialidades = !isEnfermeira && !isAdmin;

  useScrollBlock(!!(editMode || editSenha));

  const carregar = async () => {
    try {
      const [resPerfil, resEsp] = await Promise.all([
        fetch(`${API_URL}/api/Perfil`, { headers: { Authorization: `Bearer ${token}` } }),
        isEnfermeira ? Promise.resolve(null) : fetch(`${API_URL}/api/Especialidades/minhas`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resPerfil.ok) {
        const dados = await resPerfil.json();
        setMedico(dados);
        if (dados.fotoBase64) {
          setFotoBase64(dados.fotoBase64);
          localStorage.setItem(storageKeys.fotoBase64, dados.fotoBase64);
        }
        setFormEdit(f => ({ ...f, nome: dados.nome || "", email: dados.email || "", telefone: dados.telefone || "" }));
      }
      if (resEsp && resEsp.ok) setEspecialidades(await resEsp.json());
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  useEffect(() => {
    if (profissionalId) carregar();
  }, [profissionalId, token]);

  const adicionarEspecialidade = (esp: string) => {
    const idx = ESPECIALIDADES.indexOf(esp as any);
    if (idx >= 0 && !especialidades.some(e => e.nome === esp)) {
      if (especialidades.length >= 2) {
        toast.warning("Médicos podem ter no máximo 2 especialidades.");
        return;
      }
      setEspecialidades([...especialidades, { id: idx, nome: esp }]);
    }
    setBusca("");
  };

  const removerEspecialidade = (nome: string) => {
    setEspecialidades(especialidades.filter(e => e.nome !== nome));
  };

  const salvarTudo = async () => {
    setSalvandoPerfil(true);
    try {
      // 1. Salvar Perfil (Nome/Email)
      const resPerfil = await fetch(`${API_URL}/api/Perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: formEdit.nome, email: formEdit.email, telefone: formEdit.telefone })
      });

      if (!resPerfil.ok) {
        toast.error(await resPerfil.text());
        setSalvandoPerfil(false);
        return;
      }

      // 2. Salvar Senha se necessário
      if (editSenha) {
        if (!formEdit.novaSenha || !formEdit.senhaAtual || !formEdit.confirmarSenha) {
          toast.warning("Preencha todos os campos de senha.");
          setSalvandoPerfil(false);
          return;
        }
        if (formEdit.novaSenha !== formEdit.confirmarSenha) {
          toast.error("As senhas não coincidem.");
          setSalvandoPerfil(false);
          return;
        }

        const resSenha = await fetch(`${API_URL}/api/Perfil/senha`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ senhaAtual: formEdit.senhaAtual, novaSenha: formEdit.novaSenha })
        });

        if (!resSenha.ok) {
          toast.error(await resSenha.text());
          setSalvandoPerfil(false);
          return;
        }
      }

      // 3. Salvar Especialidades (apenas médicos)
      if (temEspecialidades) {
        const resEsp = await fetch(`${API_URL}/api/Especialidades/minhas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(especialidades.map(e => e.id))
        });
        if (!resEsp.ok) {
          toast.error(await resEsp.text() || "Erro ao salvar especialidades.");
          setSalvandoPerfil(false);
          return;
        }
        setEspecialidades(await resEsp.json());
      }

      toast.success("Dados atualizados com sucesso!");
      setEditMode(false);
      setEditSenha(false);
      setBusca("");
      setFormEdit(f => ({ ...f, senhaAtual: "", novaSenha: "", confirmarSenha: "" }));
      carregar();
    } catch (e) { 
      toast.error("Erro de conexão."); 
    } finally { 
      setSalvandoPerfil(false); 
    }
  };

  const cancelarEdicao = () => {
    setEditMode(false);
    setEditSenha(false);
    setBusca("");
    setFormEdit({
      nome: medico?.nome || "",
      email: medico?.email || "",
      telefone: medico?.telefone || "",
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: ""
    });
    carregar(); // reverte especialidades ao estado salvo
  };

  const nomesSelecionados = especialidades.map(e => e.nome);
  const especialidadesFiltradas = ESPECIALIDADES.filter(
    esp => esp.toLowerCase().includes(busca.toLowerCase()) && !nomesSelecionados.includes(esp)
  );

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-[3px] border-line border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto space-y-8 px-4">
      {/* Header Profissional */}
      <div className="flex items-center gap-4">
        <AvatarUpload
          fotoBase64={fotoBase64}
          iniciais={isEnfermeira ? "ENF" : "MD"}
          size={80}
          onFotoAtualizada={(base64) => {
            setFotoBase64(base64);
            window.dispatchEvent(new CustomEvent("fotoPerfilAtualizada", { detail: base64 }));
          }}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-ink leading-none">Meu perfil</h1>
          <p className="text-muted text-sm mt-1 truncate">Perfil de {medico?.nome}</p>
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

      {/* Dados Pessoais */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-line overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* NOME */}
          <div className="px-6 py-4 flex items-center justify-between hover:bg-canvas transition-colors group border-b md:border-b-0 md:border-r border-line">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Nome Completo</span>
              {editMode ? (
                <input 
                  type="text" 
                  value={formEdit.nome} 
                  onChange={e => setFormEdit({...formEdit, nome: e.target.value})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{medico?.nome}</span>
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
                  value={formEdit.email} 
                  onChange={e => setFormEdit({...formEdit, email: e.target.value})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{medico?.email}</span>
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
                  maxLength={15}
                  value={formEdit.telefone}
                  onChange={e => setFormEdit({...formEdit, telefone: mascaraTelefone(e.target.value)})}
                  className="text-sm font-medium text-ink bg-transparent border-b border-line outline-none focus:border-brand-600 py-1"
                  placeholder="(00) 00000-0000"
                />
              ) : (
                <span className="text-sm font-semibold text-ink">{medico?.telefone ? mascaraTelefone(medico.telefone) : "—"}</span>
              )}
            </div>
          </div>

          {/* CPF  */}
          <div className="px-6 py-4 flex flex-col gap-1 border-t border-line bg-canvas">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">CPF</span>
            <span className="text-sm font-bold text-muted">{mascaraCpf(medico?.cpf || "")}</span>
          </div>

          {/* SENHA */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-line hover:bg-canvas transition-colors group">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Senha</span>
              <span className="text-sm font-bold text-ink tracking-[0.3em]">••••••••</span>
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
                    value={formEdit.senhaAtual}
                    onChange={e => setFormEdit({...formEdit, senhaAtual: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Nova senha"
                    value={formEdit.novaSenha}
                    onChange={e => setFormEdit({...formEdit, novaSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Confirme a nova senha"
                    value={formEdit.confirmarSenha}
                    onChange={e => setFormEdit({...formEdit, confirmarSenha: e.target.value})}
                    className="w-full p-3 bg-white border border-line rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#2C5282] font-bold"
                  />
                </div>

                {/* Botões de Ação ao lado de Confirmar Senha */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-end justify-end gap-3 pb-1">
                  <button 
                    onClick={cancelarEdicao}
                    className="w-full sm:w-auto px-8 py-3 border border-gray-300 text-muted rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-canvas transition-colors bg-white shadow-sm text-center"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={salvarTudo}
                    disabled={salvandoPerfil}
                    className="w-full sm:w-auto px-10 py-3 bg-[#2C5282] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#152D5C] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {salvandoPerfil ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
                    ) : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Seção Especialidades (Apenas Médicos) */}
      {temEspecialidades && (
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-2">
            <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">Minhas Especialidades</h3>
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">{especialidades.length} selecionada{especialidades.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-line shadow-sm space-y-6">
            <div className="flex flex-wrap gap-2">
              {especialidades.map(esp => (
                <span key={esp.id} className="inline-flex items-center gap-2 bg-brand-50 text-[#2C5282] px-4 py-2 rounded-xl text-xs font-black border border-line group animate-in zoom-in duration-200">
                  {esp.nome}
                  {editMode && (
                    <button onClick={() => removerEspecialidade(esp.nome)} className="hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                  )}
                </span>
              ))}
              {especialidades.length === 0 && <p className="text-xs text-muted italic">Nenhuma especialidade selecionada.</p>}
            </div>

            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => setFocado(true)}
                onBlur={() => setTimeout(() => setFocado(false), 200)}
                readOnly={!editMode}
                placeholder={editMode ? "Buscar nova especialidade..." : "Clique em Editar para alterar suas especialidades"}
                className={`w-full p-4 border rounded-2xl outline-none font-bold text-sm transition-all ${editMode ? "bg-gray-50 border-line focus:ring-2 focus:ring-[#2C5282]" : "bg-gray-100/60 border-line text-muted cursor-not-allowed"}`}
              />
              {editMode && (busca || focado) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-line rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {especialidadesFiltradas.length > 0 ? (
                      especialidadesFiltradas.map(esp => (
                        <button
                          key={esp}
                          onClick={() => adicionarEspecialidade(esp)}
                          className="w-full text-left px-6 py-3 text-sm font-bold text-body hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        >
                          {esp}
                        </button>
                      ))
                    ) : (
                      <p className="px-6 py-4 text-xs text-muted font-bold uppercase tracking-widest">Nenhuma sugestão disponível</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botões de Ação (Salvar / Cancelar) - Apenas se não estiver editando senha */}
      {editMode && !editSenha && (
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
          <button
            onClick={cancelarEdicao}
            className="w-full sm:w-auto px-8 py-3 border border-gray-300 text-muted rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-canvas transition-colors bg-white shadow-sm text-center"
          >
            Cancelar
          </button>
          <button
            onClick={salvarTudo}
            disabled={salvandoPerfil}
            className="w-full sm:w-auto px-10 py-3 bg-[#2C5282] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-100 hover:bg-[#152D5C] transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {salvandoPerfil ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
            ) : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}