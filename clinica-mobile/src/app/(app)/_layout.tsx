import { Stack } from 'expo-router';

// Grupo protegido. Por enquanto um Stack simples; as abas do paciente
// (Agendar / Minhas Consultas / Notificações / Perfil) entram aqui depois.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
