import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';

const ROXO = '#7C3AED';

// Placeholder da área autenticada — valida o fluxo de login/logout.
// Será substituído pelas abas do paciente (Agendar / Minhas Consultas /
// Notificações / Perfil).
export default function HomeScreen() {
  const { session, logout } = useAuth();
  const primeiroNome = session?.nome?.split(' ')[0] || 'paciente';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.ola}>Olá, {primeiroNome} 👋</Text>
          <Text style={styles.subtitulo}>Você está autenticado.</Text>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}
        >
          <Text style={styles.botaoTexto}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 40 },
  header: { gap: 8 },
  ola: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  botao: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botaoPressionado: { opacity: 0.7 },
  botaoTexto: { color: ROXO, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
