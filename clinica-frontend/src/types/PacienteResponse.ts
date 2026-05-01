export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  usuarioId?: string;
  tipo: string;
  ultimoAcesso?: string;
}
