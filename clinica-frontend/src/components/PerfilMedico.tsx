import { useEffect, useState } from "react";
import { ESPECIALIDADES } from "../constants/especialidades";
import { mascaraCpf } from "../utils/validators";
import { AlertTriangle, X } from 'lucide-react';

export default function PerfilMedico() {
  const [medico, setMedico] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [especialidades, setEspecialidades] = useState<{ id: number, nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [focado, setFocado] = useState(false);

  const [modalEditar, setModalEditar] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [formEdit, setFormEdit] = useState({ nome: "", email: "" });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro", texto: string } | null>(null);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modalMensagem, setModalMensagem] = useState<string | null>(null);

  const profissionalId = localStorage.getItem("profissionalId");
  const token = localStorage.getItem("authToken");
  const isEnfermeira = localStorage.getItem("tipoUsuario") === "Enfermeira";

  const carregar = async () => {
    try {
      const [resPerfil, resEsp] = await Promise.all([
        fetch("http://localhost:5045/api/Perfil", { headers: { Authorization: `Bearer ${token}` } }),
        isEnfermeira ? Promise.resolve(null) : fetch("http://localhost:5045/api/Especialidades/minhas", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resPerfil.ok) {
        const dados = await resPerfil.json();
        setMedico(dados);
        setFormEdit({ nome: dados.nome || "", email: dados.email || "" });
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
      setEspecialidades([...especialidades, { id: idx, nome: esp }]);
    }
    setBusca("");
  };

  const removerEspecialidade = (nome: string) => {
    setEspecialidades(especialidades.filter(e => e.nome !== nome));
  };

  const salvarEspecialidades = async () => {
    setSalvando(true);
    try {
      const res = await fetch("http://localhost:5045/api/Especialidades/minhas", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(especialidades.map(e => e.id))
      });
      if (res.ok) setEspecialidades(await res.json());
    } catch (e) { console.error(e); }
    finally { setSalvando(false); }
  };

  const salvarPerfil = async () => {
    setSalvandoPerfil(true);
    try {
      const res = await fetch("http://localhost:5045/api/Perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formEdit)
      });
      if (res.ok) {
        setModalEditar(false);
        carregar();
        setModalMensagem("Perfil atualizado com sucesso!");
      } else {
        setModalMensagem(await res.text());
      }
    } catch (e) { setModalMensagem("Erro de conexão."); }
    finally { setSalvandoPerfil(false); }
  };

  const nomesSelecionados = especialidades.map(e => e.nome);
  const especialidadesFiltradas = ESPECIALIDADES.filter(
    esp => esp.toLowerCase().includes(busca.toLowerCase()) && !nomesSelecionados.includes(esp)
  );

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-purple-100 border-t-[#7C3AED] rounded-full animate-spin"></div>
      </div>
    );
  }

  const alterarSenha = async () => {
    if (!novaSenha || !senhaAtual || !confirmarSenha) return setModalMensagem("Preencha todos os campos.");
    // A real validação está sendo feita no backend
    if (novaSenha !== confirmarSenha) return setModalMensagem("As senhas não coincidem.");
    if (senhaAtual === novaSenha) return setModalMensagem("A nova senha não pode ser igual a senha atual!");

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
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto space-y-10">
      {/* Header Profissional */}
      <div className="flex items-center gap-6">
        <div className={`w-20 h-20 text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl shrink-0 ${isEnfermeira ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-100' : 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-100'}`}>
          {isEnfermeira ? "ENF" : "MD"}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">{medico?.nome}</h1>
          {!isEnfermeira && (
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">CRM: {medico?.crm}{medico?.ufCrm ? `-${medico.ufCrm}` : ''}</p>
          )}
          {isEnfermeira && (
            <p className="text-teal-500 text-xs font-bold uppercase tracking-widest mt-1">Enfermaria</p>
          )}
        </div>
        <button onClick={() => setModalEditar(true)} className="p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors font-bold text-xs uppercase shadow-sm">Editar Dados</button>
        {/* MODAL MENSAGEM */}
        {modalMensagem && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-purple-50 animate-in zoom-in duration-200">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Aviso</h3>
              <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{modalMensagem}</p>
              <button className="w-full bg-[#7C3AED] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-100" onClick={() => setModalMensagem(null)}>Entendido</button>
            </div>
          </div>
        )}
      </div>

      {/* Dados Pessoais */}
      <div className="space-y-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 flex flex-col gap-1 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome Completo</span>
          <span className="text-sm font-bold text-gray-800">{medico?.nome}</span>
        </div>
        <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPF</span>
          <span className="text-sm font-bold text-gray-800">{mascaraCpf(medico?.cpf || "")}</span>
        </div>
        <div className="px-6 py-4 flex flex-col gap-1 border-t border-gray-50 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">E-mail</span>
          <span className="text-sm font-bold text-gray-800">{medico?.email}</span>
        </div>
      </div>

      {/* Seção Especialidades (Apenas Médicos) */}
      {!isEnfermeira && (
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Minhas Especialidades</h3>
            <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded-lg">{especialidades.length} selecionada{especialidades.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-wrap gap-2">
              {especialidades.map(esp => (
                <span key={esp.id} className="inline-flex items-center gap-2 bg-purple-50 text-[#7C3AED] px-4 py-2 rounded-xl text-xs font-black border border-purple-100 group animate-in zoom-in duration-200">
                  {esp.nome}
                  <button onClick={() => removerEspecialidade(esp.nome)} className="hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                </span>
              ))}
              {especialidades.length === 0 && <p className="text-xs text-gray-400 italic">Nenhuma especialidade selecionada.</p>}
            </div>

            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => setFocado(true)}
                onBlur={() => setTimeout(() => setFocado(false), 200)}
                placeholder="Buscar nova especialidade..."
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-400 font-bold text-sm transition-all"
              />
              {(busca || focado) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {especialidadesFiltradas.length > 0 ? (
                      especialidadesFiltradas.map(esp => (
                        <button
                          key={esp}
                          onClick={() => adicionarEspecialidade(esp)}
                          className="w-full text-left px-6 py-3 text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                        >
                          {esp}
                        </button>
                      ))
                    ) : (
                      <p className="px-6 py-4 text-xs text-gray-400 font-bold uppercase tracking-widest">Nenhuma sugestão disponível</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={salvarEspecialidades}
              disabled={salvando}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Especialidades'}
            </button>
          </div>
        </div>
      )}

      {/* Ação Senha */}
      <div className="pt-4 border-t border-gray-100">
        <button onClick={() => setModalSenha(true)} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95">
          Alterar Senha
        </button>
      </div>

      {/* MODAL EDITAR DADOS */}
      {modalEditar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Editar Dados</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome</label>
                <input type="text" value={formEdit.nome} onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                <input type="email" value={formEdit.email} onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setModalEditar(false)} disabled={salvandoPerfil} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button>
              <button onClick={salvarPerfil} disabled={salvandoPerfil} className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-purple-100 hover:bg-[#6D28D9] transition-colors">{salvandoPerfil ? 'Salvando' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTERAR SENHA */}
      {modalSenha && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Nova Senha</h3>
            <div className="space-y-3">
              <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400" placeholder="Senha atual" />
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400" placeholder="Nova senha" />
              <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-purple-400" placeholder="Confirme a nova senha" />
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setModalSenha(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button>
              <button onClick={alterarSenha} className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-purple-100 hover:bg-[#6D28D9] transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}