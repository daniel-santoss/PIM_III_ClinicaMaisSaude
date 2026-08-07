// Chaves do armazenamento seguro (expo-secure-store → Keychain no iOS / Keystore
// no Android). Guardamos aqui apenas o essencial da sessão do paciente.
// Obs.: chaves do SecureStore aceitam só [A-Za-z0-9._-].
export const storageKeys = {
  authToken: 'authToken',
  refreshToken: 'refreshToken',
  pacienteId: 'pacienteId',
  nomeUsuario: 'nomeUsuario',
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
