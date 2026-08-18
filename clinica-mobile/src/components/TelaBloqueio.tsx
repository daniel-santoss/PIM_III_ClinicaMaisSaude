import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/AuthContext';

const ROXO = '#7C3AED';

// Cobre o app quando há sessão salva mas ele está bloqueado por biometria.
// Dispara o prompt automaticamente ao montar; permite tentar de novo ou sair.
export default function TelaBloqueio() {
  const { session, desbloquear, logout } = useAuth();
  const [tentando, setTentando] = useState(false);
  const jaTentou = useRef(false);

  async function tentar() {
    if (tentando) return;
    setTentando(true);
    try {
      await desbloquear();
    } finally {
      setTentando(false);
    }
  }

  // Dispara o prompt uma vez, automaticamente, ao abrir.
  useEffect(() => {
    if (jaTentou.current) return;
    jaTentou.current = true;
    tentar();
  }, []);

  const primeiroNome = (session?.nome || '').trim().split(' ')[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.corpo}>
        <View style={styles.icone}>
          <Ionicons name="lock-closed" size={40} color={ROXO} />
        </View>
        <Text style={styles.titulo}>App bloqueado</Text>
        <Text style={styles.sub}>
          {primeiroNome ? `Olá, ${primeiroNome}. ` : ''}Use sua biometria para continuar.
        </Text>

        <Pressable onPress={tentar} disabled={tentando} style={({ pressed }) => [styles.botao, pressed && { opacity: 0.85 }]}>
          {tentando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="finger-print" size={20} color="#fff" />
              <Text style={styles.botaoTexto}>Desbloquear</Text>
            </>
          )}
        </Pressable>
      </View>

      <Pressable onPress={logout} style={styles.sair}>
        <Text style={styles.sairTexto}>Sair da conta</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Cobre toda a tela por cima da navegação (que segue montada por baixo).
  safe: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 10 },
  corpo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  icone: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, fontWeight: '500', color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: ROXO,
  },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sair: { alignItems: 'center', paddingVertical: 20 },
  sairTexto: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
