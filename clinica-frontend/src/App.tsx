import { useState, useEffect } from "react";
import PacienteList from "./components/PacienteList";
import AgendamentoList from "./components/AgendamentoList";
import Login from "./components/Login";
import { CadastroUsuario } from "./components/CadastroUsuario";
import { mascaraCpf } from "./utils/validators";

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
    setAutenticado(false);
  };
  const [recarregarUsuarios, setRecarregarUsuarios] = useState(0);



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
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 border px-3 py-1 rounded bg-white">Perfil: {tipoUsuario}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Sair</button>
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
            Pacientes
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

      </div>

      {/* Conteúdo da Aba: Pacientes */}
      {abaAtiva === "pacientes" && (
        <>
          <div className="mb-8">
            <CadastroUsuario onUserCreated={() => setRecarregarUsuarios((prev) => prev + 1)} />
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pacientes Cadastrados</h2>
          <PacienteList recarregarContador={recarregarUsuarios} />
        </>
      )}

      {/* Conteúdo da Aba: Agendamentos */}
      {abaAtiva === "agendamentos" && (
        <AgendamentoList />
      )}


    </div>
  )
}