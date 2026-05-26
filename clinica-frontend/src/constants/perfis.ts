export const perfis = {
  medico: "Medico",
  enfermeira: "Enfermeira",
  paciente: "Paciente",
  admin: "Admin"
} as const;

export type TipoUsuario = typeof perfis[keyof typeof perfis];

export const mapLabelPerfil: Record<TipoUsuario, string> = {
  [perfis.medico]: "Médico",
  [perfis.enfermeira]: "Enfermeira",
  [perfis.paciente]: "Paciente",
  [perfis.admin]: "Administrador"
};
