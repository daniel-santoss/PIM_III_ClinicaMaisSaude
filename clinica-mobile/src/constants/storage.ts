// Chaves do armazenamento seguro (expo-secure-store → Keychain no iOS / Keystore
// no Android). Guardamos aqui apenas o essencial da sessão do paciente.
// Obs.: chaves do SecureStore aceitam só [A-Za-z0-9._-].
export const storageKeys = {
  authToken: 'authToken',
  refreshToken: 'refreshToken',
  pacienteId: 'pacienteId',
  nomeUsuario: 'nomeUsuario',
  biometriaAtiva: 'biometriaAtiva',
  // Identificador (CPF/e-mail) do último login — usado para desbloquear por
  // senha (app-lock) e para pré-preencher o login quando "Lembrar usuário".
  contaIdentificador: 'contaIdentificador',
  // Preferência "Lembrar usuário": '1' mantém o identificador/nome após o logout
  // (login pede só a senha); '0' esquece. Ausente = padrão (lembrar).
  lembrarUsuario: 'lembrarUsuario',
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
