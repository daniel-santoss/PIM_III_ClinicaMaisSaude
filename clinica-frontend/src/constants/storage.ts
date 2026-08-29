export const storageKeys = {
  authToken: "authToken",
  refreshToken: "refreshToken",
  tipoUsuario: "tipoUsuario",
  isAdmin: "isAdmin",
  pacienteId: "pacienteId",
  profissionalId: "profissionalId",
  nomeUsuario: "nomeUsuario",
  fotoBase64: "fotoBase64",
  violacaoDetectada: "violacaoDetectada",
  // "Lembrar usuário": pré-preenche o identificador no próximo login.
  // lembrarUsuario ausente ou "1" = lembrar; "0" = esquecer.
  lembrarUsuario: "lembrarUsuario",
  contaIdentificador: "contaIdentificador"
} as const;

export type StorageKey = typeof storageKeys[keyof typeof storageKeys];
