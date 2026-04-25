import { useState } from "react";
import PacienteList from "./components/PacienteList";
import AgendamentoList from "./components/AgendamentoList";

interface PacienteRequest {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<"pacientes" | "agendamentos">("pacientes");

  const [paciente, setPaciente] = useState<PacienteRequest>({
    nome: '',
    cpf: '',
    telefone: '',
    email: ''
  });

  const [recarregar, setRecarregar] = useState(0);

  const enviarDados = async () => {
    const response = await fetch('http://localhost:5045/api/Pacientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paciente)
    })
    if (!response.ok) {
      { const erro = await response.text(); alert(erro); return; }
    }
    alert('Paciente cadastrado com sucesso!');
    setPaciente({ nome: '', cpf: '', telefone: '', email: '' });
    setRecarregar((prev) => prev + 1);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4 border-gray-200">Clínica Mais Saúde</h1>
      
      {/* Abas de Navegação */}
      <div className="flex space-x-1 border-b border-gray-200 mb-8">
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
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Novo Paciente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" className="p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="Nome completo" value={paciente.nome} onChange={(e) => setPaciente({ ...paciente, nome: e.target.value })} />
              <input type="text" className="p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" maxLength={14} placeholder="CPF (somente números ou formato)" value={paciente.cpf} onChange={(e) => setPaciente({ ...paciente, cpf: e.target.value })} />
              <input type="text" className="p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" maxLength={15} placeholder="Telefone" value={paciente.telefone} onChange={(e) => setPaciente({ ...paciente, telefone: e.target.value })} />
              <input type="email" className="p-3 border border-gray-300 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="E-mail" value={paciente.email} onChange={(e) => setPaciente({ ...paciente, email: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors shadow-sm" onClick={enviarDados}>
                Salvar Paciente
              </button>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pacientes Cadastrados</h2>
          <PacienteList recarregarContador={recarregar} />
        </>
      )}

      {/* Conteúdo da Aba: Agendamentos */}
      {abaAtiva === "agendamentos" && (
        <AgendamentoList />
      )}
    </div>
  )
}