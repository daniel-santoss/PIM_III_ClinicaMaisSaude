// Espelha o PacienteResponse do backend (GET /api/Pacientes/{id}), campos usados
// no app. `temProblemaMemoria` é lido apenas para exibição read-only.
export interface PacientePerfil {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  temProblemaMemoria: boolean;
  fotoBase64: string | null;
}

export interface DadosPerfilInput {
  nome: string;
  email: string;
  telefone: string;
}
