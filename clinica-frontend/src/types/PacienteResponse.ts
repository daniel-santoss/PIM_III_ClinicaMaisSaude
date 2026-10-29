export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  usuarioId?: string;
  tipo: string;
  ultimoAcesso?: string;
  isBanidoPermanente?: boolean;
  fotoBase64?: string;
  /** Escala 12x36 (só profissionais). */
  escala?: number | null;
  /** Primeiro plantão (só profissionais). */
  inicioPlantoes?: string | null;
}
