// URL base da API REST — a MESMA consumida pelo web (clinica-frontend).
//
// ⚠️ Em device físico ou emulador, "localhost" NÃO aponta para a máquina de dev:
//   - Emulador Android: use http://10.0.2.2:5045
//   - Device físico:    use o IP LAN da máquina, ex.: http://192.168.0.10:5045
//   - iOS Simulator:    localhost funciona
// Configure sem recompilar via variável de ambiente EXPO_PUBLIC_API_URL
// (o prefixo EXPO_PUBLIC_ é obrigatório para a var ser exposta ao app).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5045';
