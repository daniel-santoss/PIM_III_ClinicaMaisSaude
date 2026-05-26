export const storageKeys = {
  authToken: "authToken",
  refreshToken: "refreshToken",
  tipoUsuario: "tipoUsuario",
  isAdmin: "isAdmin",
  pacienteId: "pacienteId",
  profissionalId: "profissionalId",
  nomeUsuario: "nomeUsuario",
  fotoBase64: "fotoBase64",
  violacaoDetectada: "violacaoDetectada"
} as const;

export type StorageKey = typeof storageKeys[keyof typeof storageKeys];
