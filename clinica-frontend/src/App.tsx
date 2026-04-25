import { useState } from "react";

interface PacienteRequest {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function App() {

  const [paciente, setPaciente] = useState<PacienteRequest>({
    nome: '',
    cpf: '',
    telefone: '',
    email: ''
  });

  const enviarDados = async () => {
    const response = await fetch('https://localhost:7290/api/Pacientes', {
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
  }

  return (
    <div>
      <h1>Cadastro de Pacientes</h1>
      <input type="text" className="p-2 border rounded w-full bg-gray-50" placeholder="Nome" value={paciente.nome} onChange={(e) => setPaciente({ ...paciente, nome: e.target.value })} />
      <input type="text" className="p-2 border rounded w-full bg-gray-50" maxLength={14} placeholder="CPF" value={paciente.cpf} onChange={(e) => setPaciente({ ...paciente, cpf: e.target.value })} />
      <input type="text" className="p-2 border rounded w-full bg-gray-50" maxLength={15} placeholder="Telefone" value={paciente.telefone} onChange={(e) => setPaciente({ ...paciente, telefone: e.target.value })} />
      <input type="email" className="p-2 border rounded w-full bg-gray-50" placeholder="Email" value={paciente.email} onChange={(e) => setPaciente({ ...paciente, email: e.target.value })} />
      <button className="p-2 bg-green-500 text-white rounded" onClick={enviarDados}>Salvar</button>
    </div>
  )
}