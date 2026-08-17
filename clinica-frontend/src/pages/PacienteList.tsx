import { API_URL } from "../constants/api";
import { storageKeys } from "../constants/storage";
import { perfis, type TipoUsuario } from "../constants/perfis";
import { useEffect, useState } from "react";
import { mascaraCpf, mascaraTelefone } from "../utils/validators";
import { AlertCircle, Users, UserCheck, Activity, Clock, Search, Filter, RefreshCw, Inbox, Pencil, Key, Trash, Check, Copy, X } from 'lucide-react';
import type { PacienteResponse } from "../types/PacienteResponse";
import { useScrollBlock } from "../hooks/useScrollBlock";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ModalPortal from "../components/ui/ModalPortal";

const modalInputCls =
  "w-full h-10 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted";
const modalLabelCls = "block text-[13px] font-medium text-body mb-1";

interface PacienteListProps {
  recarregarContador?: number;
  pacienteInicialEdicao?: PacienteResponse | null;
  onFinalizouEdicaoExterno?: () => void;
}

interface PacienteEdicao {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}


export default function PacienteList({ 
  recarregarContador = 0, 
  pacienteInicialEdicao = null,
  onFinalizouEdicaoExterno
}: PacienteListProps) {
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshInterno, setRefreshInterno] = useState(0);

  const [buscaNome, setBuscaNome] = useState("");
  const [buscaCpf, setBuscaCpf] = useState("");
  const [perfisSelecionados, setPerfisSelecionados] = useState<TipoUsuario[]>([perfis.paciente, perfis.medico, perfis.enfermeira]);
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const toast = useToast();

  const limparFiltros = () => {
    setBuscaNome("");
    setBuscaCpf("");
    setPerfisSelecionados([perfis.paciente, perfis.medico, perfis.enfermeira]);
  };

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PacienteEdicao>({ nome: "", cpf: "", telefone: "", email: "" });
  const [salvando, setSalvando] = useState(false);

  const [excluindoPaciente, setExcluindoPaciente] = useState<{ id: string, nome: string } | null>(null);
  const [excluindoLoader, setExcluindoLoader] = useState(false);

  const [pacienteReset, setPacienteReset] = useState<{ id: string, usuarioId: string, nome: string } | null>(null);
  const [novaSenhaReset, setNovaSenhaReset] = useState("");
  const [senhaExibida, setSenhaExibida] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMensagem, setResetMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const isAdmin = localStorage.getItem(storageKeys.isAdmin) === "true";
  const isEnfermeira = localStorage.getItem(storageKeys.tipoUsuario) === perfis.enfermeira;

  useScrollBlock(!!(editandoId || pacienteReset));

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCarregando(true);
      setErro(null);

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      const termoBusca = buscaNome.trim();
      if (termoBusca) {
        if (/^\d+$/.test(termoBusca)) {
          params.set("cpf", termoBusca);
        } else {
          params.set("nome", termoBusca);
        }
      }

      const queryString = params.toString();
      const url = `${API_URL}/api/Pacientes${queryString ? `?${queryString}` : ""}`;

      const token = localStorage.getItem(storageKeys.authToken);
      
      fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => {
           if (!r.ok) throw new Error(`Erro ao buscar pacientes: ${r.status}`);
           return r.json();
        })
        .then(data => {
            if (data.items) {
                setPacientes(data.items);
                setTotalCount(data.totalCount);
                setTotalPages(data.totalPages || Math.ceil(data.totalCount / pageSize));
            } else {
                setPacientes(data);
                setTotalCount(data.length);
                setTotalPages(1);
            }
        })
        .catch((err: Error) => setErro(err.message))
        .finally(() => setCarregando(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [recarregarContador, refreshInterno, buscaNome, buscaCpf, page]);

  // Reset page to 1 when search filters change
  useEffect(() => {
    setPage(1);
  }, [buscaNome, buscaCpf, perfisSelecionados]);

  // Efeito para abrir edição externa (Vindo da Agenda por exemplo)
  useEffect(() => {
    if (pacienteInicialEdicao) {
      abrirEdicao(pacienteInicialEdicao);
    }
  }, [pacienteInicialEdicao]);

  const abrirEdicao = (p: PacienteResponse) => {
    setEditandoId(p.id);
    setForm({ nome: p.nome, cpf: p.cpf, telefone: p.telefone, email: p.email });
  };

  const fecharModal = () => {
    setEditandoId(null);
    if (onFinalizouEdicaoExterno) onFinalizouEdicaoExterno();
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    setSalvando(true);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Pacientes/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        if (response.status === 400) toast.error(await response.text());
        return;
      }
      toast.success("Edição salva com sucesso!");
      fecharModal();
      setRefreshInterno((prev) => prev + 1);
    } catch (err) {
      toast.error("Erro ao salvar edição.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalExclusao = (id: string, nome: string) => {
    setExcluindoPaciente({ id, nome });
  };

  const fecharModalExclusao = () => {
    setExcluindoPaciente(null);
  };

  const confirmarExclusao = async () => {
    if (!excluindoPaciente) return;
    setExcluindoLoader(true);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/Pacientes/${excluindoPaciente.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 400) toast.error(await response.text());
        return;
      }
      toast.success("Paciente excluído com sucesso.");
      setExcluindoPaciente(null);
      setRefreshInterno((prev) => prev + 1);
    } catch (err) {
      toast.error("Erro ao excluir paciente.");
    } finally {
      setExcluindoLoader(false);
    }
  };

  const handleResetSenha = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pacienteReset || !novaSenhaReset) return;
    setResetLoading(true);
    setResetMensagem(null);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const response = await fetch(`${API_URL}/api/LoginPortal/${pacienteReset.usuarioId}/reset-senha`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ novaSenha: novaSenhaReset })
      });

      if (!response.ok) {
        const err = await response.text();
        setResetMensagem({ texto: err || "Erro ao redefinir.", erro: true });
      } else {
        setSenhaExibida(novaSenhaReset);
        setNovaSenhaReset("");
        setResetMensagem(null);
      }
    } catch (e) {
      setResetMensagem({ texto: "Falha de conexão.", erro: true });
    } finally {
      setResetLoading(false);
    }
  };

  const fecharModalReset = () => {
    setPacienteReset(null);
    setNovaSenhaReset("");
    setSenhaExibida(null);
    setResetMensagem(null);
    setCopiado(false);
  };

  const copiarSenha = () => {
    if (!senhaExibida) return;
    navigator.clipboard.writeText(senhaExibida);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (erro) {
    return <p className="text-center text-red-500 py-8">{erro}</p>;
  }

  const totalPacientes = pacientes.filter(p => p.tipo === perfis.paciente).length;
  const totalMedicos = pacientes.filter(p => p.tipo === perfis.medico).length;
  const totalEnfermeiras = pacientes.filter(p => p.tipo === perfis.enfermeira).length;

  
  const sessentaDiasAtras = new Date();
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

  const getRealDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  };


  const pacientesInativos = pacientes.filter(p => {
    if (p.tipo !== perfis.paciente) return false;
    const data = getRealDate(p.ultimoAcesso);
    return !data || data < sessentaDiasAtras;
  });

  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 shadow-sm max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Ops! Algo deu errado</h3>
          <p className="text-sm opacity-90">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- CARDS DE RESUMO --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-[18px] h-[18px]" />}
          tone="brand"
          label="Total"
          value={pacientes.length}
          sub="usuários cadastrados"
        />
        <StatCard
          icon={<UserCheck className="w-[18px] h-[18px]" />}
          tone="brand"
          label="Pacientes"
          value={totalPacientes}
          sub="ativos no portal"
        />
        <StatCard icon={<Activity className="w-[18px] h-[18px]" />} tone="neutral" label="Equipe" layout="inline">
          <div className="flex gap-2 mt-2">
            <div className="flex-1 flex flex-col bg-canvas border border-line rounded-md px-2.5 py-1.5">
              <span className="font-bold text-[20px] leading-none text-ink">{totalMedicos}</span>
              <span className="font-medium text-[11px] text-body mt-0.5">Médicos</span>
            </div>
            <div className="flex-1 flex flex-col bg-canvas border border-line rounded-md px-2.5 py-1.5">
              <span className="font-bold text-[20px] leading-none text-ink">{totalEnfermeiras}</span>
              <span className="font-medium text-[11px] text-body mt-0.5">Enfermeiras</span>
            </div>
          </div>
        </StatCard>
        <StatCard
          icon={<Clock className="w-[18px] h-[18px]" />}
          tone="warning"
          label="Inativos"
          value={pacientesInativos.length}
          sub="+60 dias sem acesso"
        />
      </div>

      {/* --- TABELA E FILTROS --- */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        {/* Header da Tabela / Filtros */}
        <div className="px-5 py-4 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou CPF..."
              className="w-full h-10 pl-9 pr-3 text-sm text-ink bg-white border border-line rounded-md outline-none focus:border-brand-600 focus:shadow-focus transition-shadow placeholder:text-muted"
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
            />
          </div>

          {/* Filtro Tipo */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setMenuFiltroAberto(!menuFiltroAberto)}
                className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
              >
                <Filter className="w-[15px] h-[15px]" />
                Tipo <span className="text-muted">({perfisSelecionados.length})</span>
              </button>

              {menuFiltroAberto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuFiltroAberto(false)}></div>
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-modal border border-line py-2 z-20">
                    <div className="px-4 py-1 mb-1 border-b border-line-soft">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Filtrar categoria</span>
                    </div>
                    {[perfis.paciente, perfis.medico, perfis.enfermeira].map((perfil) => (
                      <label key={perfil} className="flex items-center gap-3 px-4 py-2 hover:bg-canvas cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-brand-600"
                          checked={perfisSelecionados.includes(perfil)}
                          onChange={(e) => {
                            if (e.target.checked) setPerfisSelecionados([...perfisSelecionados, perfil]);
                            else setPerfisSelecionados(perfisSelecionados.filter(p => p !== perfil));
                          }}
                        />
                        <span className="text-sm font-medium text-body">
                          {perfil === perfis.medico ? "Médico" : perfil}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={limparFiltros}
            className="h-10 px-3.5 inline-flex items-center gap-2 text-[13px] font-medium text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors"
            title="Limpar filtros"
          >
            <RefreshCw className="w-[15px] h-[15px]" />
            Limpar filtros
          </button>

          <span className="ml-auto text-xs font-medium text-muted">Total: {pacientes.length} registros</span>
        </div>

        {/* Listagem */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-canvas">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wide">Usuário</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wide">CPF</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Categoria</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Último acesso</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {carregando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-gray-50/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        <div className="flex flex-col gap-2">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-6 w-20 bg-gray-200 rounded-xl"></div></td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gray-200"></div>
                        <div className="w-8 h-8 rounded-xl bg-gray-200"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : pacientes.filter(p => perfisSelecionados.includes(p.tipo as TipoUsuario)).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted">
                        <Inbox className="w-10 h-10" />
                        <p className="text-sm font-medium">Nenhum resultado para os filtros atuais.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pacientes
                    .filter(p => perfisSelecionados.includes(p.tipo as TipoUsuario))
                    .map((p) => (
                    <tr key={p.id} className="hover:bg-canvas transition-colors">
                      {/* Avatar + Nome */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-semibold text-[13px] uppercase overflow-hidden">
                            {p.fotoBase64 ? (
                              <img src={p.fotoBase64} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              p.nome.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-ink">{p.nome}</span>
                            <span className="text-xs text-muted truncate max-w-[180px]">{p.email}</span>
                          </div>
                        </div>
                      </td>
                      {/* CPF */}
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] text-body">{mascaraCpf(p.cpf)}</span>
                      </td>
                      {/* Perfil Badge */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <Badge variant={p.tipo === perfis.paciente ? "brand" : "neutral"}>
                          {p.tipo === perfis.medico ? "Médico" : p.tipo}
                        </Badge>
                      </td>

                      {/* Último Acesso (Real) */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-[13px] text-body">
                          {p.ultimoAcesso ? getRealDate(p.ultimoAcesso)!.toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          }) : 'Sem registro'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Editar dados"
                            className="w-8 h-8 grid place-items-center bg-white border border-line rounded-md text-body hover:bg-canvas transition-colors"
                            onClick={() => abrirEdicao(p)}
                          >
                            <Pencil className="w-[15px] h-[15px]" />
                          </button>
                          {(isAdmin || isEnfermeira) && p.usuarioId && (
                            <button
                              title="Redefinir senha"
                              className="w-8 h-8 grid place-items-center bg-white border border-line rounded-md text-body hover:bg-canvas transition-colors"
                              onClick={() => setPacienteReset({ id: p.id, usuarioId: p.usuarioId!, nome: p.nome })}
                            >
                              <Key className="w-[15px] h-[15px]" />
                            </button>
                          )}
                          <button
                            title="Excluir usuário"
                            className="w-8 h-8 grid place-items-center bg-white border border-line rounded-md text-danger hover:bg-danger-tint hover:border-danger-border transition-colors"
                            onClick={() => abrirModalExclusao(p.id, p.nome)}
                          >
                            <Trash className="w-[15px] h-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
          </table>
        </div>

        {/* Footer / Contagem e Paginação */}
        <div className="px-5 py-3 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-muted">
            Exibindo {pacientes.length} de {totalCount} {totalCount === 1 ? "resultado" : "resultados"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-3 text-[13px] font-medium border border-line rounded-md text-body bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-canvas transition-colors"
              >
                Anterior
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  // Show max 5 page numbers: first, last, current, current-1, current+1
                  if (pNum === 1 || pNum === totalPages || (pNum >= page - 1 && pNum <= page + 1)) {
                    return (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-md transition-colors border ${
                          page === pNum
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-body border-line hover:bg-canvas'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  // Ellipsis
                  if (pNum === page - 2 || pNum === page + 2) {
                    return <span key={pNum} className="text-gray-400 text-xs px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 px-3 text-[13px] font-medium border border-line rounded-md text-body bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-canvas transition-colors"
              >
                Próximo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {editandoId && (
        <ModalPortal>
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={fecharModal}>
          <div
            className="bg-white w-full max-w-2xl rounded-xl shadow-modal flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-line shrink-0 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base text-ink">Editar Paciente</h3>
                <p className="text-[13px] text-muted mt-1">Atualize as informações cadastrais.</p>
              </div>
              <button type="button" onClick={fecharModal} className="text-muted hover:text-body p-1 -mr-1 shrink-0" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <label className={modalLabelCls}>Nome completo</label>
                  <input
                    type="text"
                    className={modalInputCls}
                    placeholder="Nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className={modalLabelCls}>CPF (inalterável)</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 text-sm text-muted bg-canvas border border-line rounded-md outline-none cursor-not-allowed"
                    value={form.cpf}
                    disabled
                  />
                </div>
                <div>
                  <label className={modalLabelCls}>Telefone de contato</label>
                  <input
                    type="text"
                    className={modalInputCls}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={modalLabelCls}>E-mail</label>
                  <input
                    type="email"
                    className={modalInputCls}
                    placeholder="exemplo@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-line shrink-0">
              <Button type="button" variant="secondary" onClick={fecharModal} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> Salvando...</>
                ) : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal de Exclusão */}
      <ConfirmModal
        isOpen={!!excluindoPaciente}
        title="Excluir Paciente"
        description={excluindoPaciente ? `Tem certeza que deseja excluir ${excluindoPaciente.nome}? Esta ação não poderá ser desfeita.` : ''}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        type="destructive"
        loading={excluindoLoader}
        onConfirm={confirmarExclusao}
        onCancel={fecharModalExclusao}
      />
      {/* Modal de Reset de Senha */}
      {pacienteReset && (
        <ModalPortal>
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={fecharModalReset}>
          <div
            className="bg-white w-full max-w-md rounded-xl shadow-modal flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-line shrink-0 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base text-ink">Redefinir senha</h3>
                <p className="text-[13px] text-muted mt-1">Paciente: <span className="font-medium text-body">{pacienteReset.nome}</span></p>
              </div>
              <button type="button" onClick={fecharModalReset} className="text-muted hover:text-body p-1 -mr-1 shrink-0" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 overflow-y-auto custom-scrollbar">
              {resetMensagem && (
                <div className={`p-3 rounded-md mb-4 text-sm border ${resetMensagem.erro ? "bg-danger-tint text-danger border-danger-border" : "bg-success-tint text-success border-success-border"}`}>
                  {resetMensagem.texto}
                </div>
              )}

              {senhaExibida ? (
                <div className="bg-warning-tint border border-warning-border p-4 rounded-md text-center">
                  <p className="text-sm font-medium text-warning-text mb-2">Anote esta senha — ela não será exibida novamente:</p>
                  <div className="relative group">
                    <p className="text-2xl font-mono font-bold text-ink bg-white border border-dashed border-warning-border py-2 px-8 rounded-md">
                      {senhaExibida}
                    </p>
                    <button
                      onClick={copiarSenha}
                      title="Copiar senha"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-warning-text hover:bg-warning-tint rounded-md transition-all active:scale-95"
                    >
                      {copiado ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                    {copiado && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] py-1 px-2 rounded shadow-lg animate-bounce">
                        Copiado!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-warning-text mt-2">Passe esta senha de forma segura para o paciente.</p>
                </div>
              ) : (
                <form onSubmit={handleResetSenha}>
                  <label className={modalLabelCls}>Nova senha</label>
                  <input
                    type="text"
                    required
                    value={novaSenhaReset}
                    onChange={(e) => setNovaSenhaReset(e.target.value)}
                    className={modalInputCls}
                    placeholder="Digite a nova senha"
                  />
                </form>
              )}
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-line shrink-0">
              <Button type="button" variant="secondary" onClick={fecharModalReset}>
                {senhaExibida ? "Fechar" : "Cancelar"}
              </Button>
              {!senhaExibida && (
                <Button type="button" variant="primary" onClick={() => handleResetSenha()} disabled={resetLoading}>
                  {resetLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> Redefinindo...</>
                  ) : "Confirmar redefinição"}
                </Button>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
  </div>
  );
}
