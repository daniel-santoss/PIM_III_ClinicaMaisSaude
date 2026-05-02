import { Settings, User, LogOut } from 'lucide-react';
import { useState, useEffect } from "react";
import PacienteList from "./components/PacienteList";
import AgendamentoList from "./components/AgendamentoList";
import Login from "./components/Login";
import { CadastroUsuario } from "./components/CadastroUsuario";
import AgendamentoPaciente from "./components/AgendamentoPaciente";
import MeusAgendamentos from "./components/MeusAgendamentos";
import PerfilPaciente from "./components/PerfilPaciente";
import PerfilMedico from "./components/PerfilMedico";

interface PacienteRequest {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"pacientes" | "agendamentos" | "cadastro">("agendamentos");
  const [viewPaciente, setViewPaciente] = useState<"novo" | "lista">("novo");
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [menuDropdownAberto, setMenuDropdownAberto] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const tipo = localStorage.getItem("tipoUsuario");
    const admin = localStorage.getItem("isAdmin") === "true";
    if (token) {
        setAutenticado(true);
        setTipoUsuario(tipo || "Paciente");
        setIsAdmin(admin);
        setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("profissionalId");
    setAutenticado(false);
  };
  const [recarregarUsuarios, setRecarregarUsuarios] = useState(0);



  const [pacienteParaEditar, setPacienteParaEditar] = useState<any>(null);

  useEffect(() => {
    const handleEditar = (e: any) => {
      setPacienteParaEditar(e.detail);
      setAbaAtiva("pacientes");
    };
    window.addEventListener("editarPacienteGlobal", handleEditar);
    return () => window.removeEventListener("editarPacienteGlobal", handleEditar);
  }, []);

  if (!autenticado) {
    return <Login onLogado={() => {
        setAutenticado(true);
        const tipo = localStorage.getItem("tipoUsuario");
        const admin = localStorage.getItem("isAdmin") === "true";
        setTipoUsuario(tipo || "Paciente");
        setIsAdmin(admin);
        setAbaAtiva(tipo === "Paciente" ? "agendamentos" : "pacientes");
    }} />
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800">Clínica Mais Saúde</h1>
       <div className="relative">
          <button
            onClick={() => setMenuDropdownAberto(!menuDropdownAberto)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-gray-200 bg-white shadow-sm font-bold text-sm"
          >
            Configurações
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
          </button>

          {menuDropdownAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuDropdownAberto(false)}></div>
              <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-2">
                <ul className="flex flex-col gap-1">
                  <li>
                    <button
                      onClick={() => { setModalPerfilAberto(true); setMenuDropdownAberto(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Meu Perfil
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-square-arrow-right-exit-icon lucide-square-arrow-right-exit"><path d="M10 12h11"/><path d="m17 16 4-4-4-4"/><path d="M21 6.344V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.344"/></svg>
                      Sair
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Abas de Navegação */}
      <div className="flex space-x-1 border-b border-gray-200 mb-8">
        {tipoUsuario !== "Paciente" && (
            <button
            onClick={() => setAbaAtiva("pacientes")}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                abaAtiva === "pacientes"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            >
            {isAdmin ? "Usuários" : "Pacientes"}
            </button>
        )}
        <button
          onClick={() => setAbaAtiva("agendamentos")}
          className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
            abaAtiva === "agendamentos"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Agendamentos
        </button>

        {tipoUsuario === "Paciente" && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => { setAbaAtiva("agendamentos"); setViewPaciente(viewPaciente === "novo" ? "lista" : "novo"); }}
              className="px-4 py-2 bg-purple-50 text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100 hover:bg-purple-100 transition-all"
            >
              {viewPaciente === "novo" ? "Ver Minhas Consultas" : "Marcar Nova Consulta"}
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo da Aba: Pacientes */}
      {abaAtiva === "pacientes" && (
        <>
          <div className="mb-8">
            <CadastroUsuario onUserCreated={() => setRecarregarUsuarios((prev) => prev + 1)} />
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {isAdmin ? "Usuários Cadastrados" : "Pacientes Cadastrados"}
          </h2>
          <PacienteList 
            recarregarContador={recarregarUsuarios} 
            pacienteInicialEdicao={pacienteParaEditar}
            onFinalizouEdicaoExterno={() => setPacienteParaEditar(null)}
          />
        </>
      )}

      {/* Conteúdo da Aba: Agendamentos */}
      {abaAtiva === "agendamentos" && (
        tipoUsuario === "Paciente" ? (
          viewPaciente === "novo" ? (
            <AgendamentoPaciente onSucesso={() => setViewPaciente("lista")} />
          ) : (
            <MeusAgendamentos onNovoAgendamento={() => setViewPaciente("novo")} />
          )
        ) : <AgendamentoList />
      )}

      {/* Modal de Perfil/Configurações */}
      {modalPerfilAberto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative flex flex-col p-2">
            <button 
              onClick={() => setModalPerfilAberto(false)}
              className="absolute right-8 top-8 p-3 bg-white text-gray-400 hover:text-red-500 rounded-2xl shadow-md transition-all z-[160]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 scroll-smooth">
              <div className="p-4 md:p-8">
                {tipoUsuario === "Medico" || tipoUsuario === "Enfermeira" ? <PerfilMedico /> : <PerfilPaciente />}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}