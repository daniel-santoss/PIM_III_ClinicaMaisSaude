// Versão web do storage (o Metro escolhe este arquivo ao gerar o build para navegador).
// O expo-secure-store não existe na web, então os tokens vão para o localStorage, como no
// portal web da clínica. É menos protegido que o Keychain/Keystore do celular: a versão
// web do app serve para demonstração; o app instalado continua usando o storage.ts.
export const storage = {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};
