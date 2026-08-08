import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';

const ROXO = '#7C3AED';

// Perfil mínimo por enquanto: identifica o paciente e permite sair.
// Edição de dados/senha/foto e exclusão de conta entram nas próximas etapas.
export default function PerfilScreen() {
  const { session, logout } = useAuth();
  const nome = session?.nome || 'Paciente';
  const inicial = nome.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil</Text>
      </View>

      <View style={styles.corpo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{inicial}</Text>
        </View>
        <Text style={styles.nome}>{nome}</Text>
      </View>

      <View style={styles.rodape}>
        <Pressable onPress={logout} style={({ pressed }) => [styles.botao, pressed && { opacity: 0.7 }]}>
          <Text style={styles.botaoTexto}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  corpo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 36, fontWeight: '800', color: ROXO },
  nome: { fontSize: 20, fontWeight: '800', color: '#111827' },
  rodape: { padding: 24 },
  botao: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botaoTexto: { color: ROXO, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
