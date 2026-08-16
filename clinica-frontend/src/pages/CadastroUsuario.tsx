import { API_URL } from "../constants/api";
import { perfis, type TipoUsuario } from "../constants/perfis";
import { useState } from "react";
import type { FormEvent } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { ChevronDown, Check, UserPlus } from 'lucide-react';
import { useToast } from "../hooks/useToast";
import Button from "../components/ui/Button";

const inputCls =
  "w-full h-10 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted";
const labelCls = "block text-[13px] font-medium text-body mb-1";


export function CadastroUsuario({ onUserCreated, tipoUsuarioLogado }: { onUserCreated?: () => void; tipoUsuarioLogado?: string }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>(perfis.paciente);
  const [crm, setCrm] = useState("");
  const [ufCrm, setUfCrm] = useState("");
  const [temProblemaMemoria, setTemProblemaMemoria] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const toast = useToast();

  const todasOpcoesPerfil = [
    { id: perfis.paciente, nome: 'Paciente' },
    { id: perfis.enfermeira, nome: 'Enfermeira' },
    { id: perfis.medico, nome: 'Médico' },
  ];

  const opcoesPerfil = tipoUsuarioLogado === perfis.enfermeira
    ? todasOpcoesPerfil.filter(o => o.id === perfis.paciente)
    : todasOpcoesPerfil;




  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setCpf("");
    setTelefone("");
    setSenha("");
    setTipoUsuario(perfis.paciente);
    setCrm("");
    setUfCrm("");
    setTemProblemaMemoria(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
          telefone: telefone || null,
          senha,
          tipoUsuario,
          crm: tipoUsuario === perfis.medico ? crm : null,
          ufCrm: tipoUsuario === perfis.medico ? ufCrm : null,
          temProblemaMemoria: tipoUsuario === perfis.paciente ? temProblemaMemoria : false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(errorText || "Erro ao realizar cadastro.");
      } else {
        toast.success("Usuário cadastrado com sucesso!");
        limparFormulario();
        if (onUserCreated) onUserCreated();
      }
    } catch (err) {
      toast.error("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[760px] bg-white border border-line rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-line">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base text-ink">Cadastro de usuários</h2>
          <span className="font-medium text-[11px] text-warning-text bg-warning-tint border border-warning-border px-2 py-0.5 rounded-md whitespace-nowrap">Acesso restrito</span>
        </div>
        <p className="text-[13px] text-muted mt-1">Preencha os dados para registrar um novo perfil no sistema.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label className={labelCls}>Nome completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputCls}
              placeholder="Digite o nome completo"
            />
          </div>
          <div>
            <label className={labelCls}>E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="exemplo@email.com"
            />
          </div>
          <div>
            <label className={labelCls}>CPF *</label>
            <input
              type="text"
              required
              maxLength={14}
              value={cpf}
              onChange={(e) => setCpf(mascaraCpf(e.target.value))}
              className={inputCls}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className={labelCls}>Senha *</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputCls}
              placeholder="••••••"
            />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              type="text"
              maxLength={15}
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              className={inputCls}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="relative">
            <label className={labelCls}>Tipo de perfil *</label>
            {opcoesPerfil.length === 1 ? (
              <div className="w-full h-10 px-3 flex items-center bg-canvas border border-line rounded-md text-sm font-medium text-body">
                {opcoesPerfil[0].nome}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDropdownAberto(!dropdownAberto)}
                  className="w-full h-10 px-3 flex items-center justify-between border border-line rounded-md bg-white text-left outline-none focus:border-brand-600 focus:shadow-focus transition-shadow"
                >
                  <span className="text-sm text-ink">
                    {opcoesPerfil.find(o => o.id === tipoUsuario)?.nome}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
                </button>

                {dropdownAberto && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownAberto(false)}></div>
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-line rounded-lg shadow-modal z-20 overflow-hidden">
                      {opcoesPerfil.map((opcao) => (
                        <div
                          key={opcao.id}
                          onClick={() => {
                            setTipoUsuario(opcao.id);
                            setDropdownAberto(false);
                          }}
                          className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between text-sm ${
                            tipoUsuario === opcao.id ? 'bg-brand-600 text-white' : 'text-body hover:bg-canvas'
                          }`}
                        >
                          <span className="font-medium">{opcao.nome}</span>
                          {tipoUsuario === opcao.id && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {tipoUsuario === perfis.medico && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 mt-4 bg-canvas p-4 rounded-md border border-line">
            <div>
              <label className={labelCls}>CRM (6 dígitos numéricos) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className={inputCls}
                placeholder="Ex: 123456"
              />
            </div>
            <div>
              <label className={labelCls}>UF do CRM *</label>
              <select
                required
                value={ufCrm}
                onChange={(e) => setUfCrm(e.target.value)}
                className={`${inputCls} cursor-pointer`}
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

        {tipoUsuario === perfis.paciente && (
          <label className="flex items-center gap-2.5 mt-4 px-3.5 py-3 bg-canvas border border-line rounded-md cursor-pointer text-sm text-body">
            <input
              type="checkbox"
              checked={temProblemaMemoria}
              onChange={(e) => setTemProblemaMemoria(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-brand-600"
            />
            <span>Paciente possui problema de memória?</span>
          </label>
        )}

        <div className="flex justify-end gap-2.5 mt-5">
          <Button type="button" variant="secondary" onClick={limparFormulario} disabled={loading}>
            Limpar formulário
          </Button>
          <Button type="submit" variant="primary" disabled={loading} icon={loading ? undefined : <UserPlus size={16} />}>
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> Aguarde...</>
            ) : "Registrar usuário"}
          </Button>
        </div>
      </form>
    </div>
  );
}
