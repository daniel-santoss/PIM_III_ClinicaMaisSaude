import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';
import ExcluirContaModal from '@/components/ExcluirContaModal';
import TrocarSenhaModal from '@/components/TrocarSenhaModal';
import { biometriaDisponivel } from '@/lib/biometria';

const AZUL = '#2C5282';

export default function ConfiguracoesScreen() {
  const router = useRouter();
  const { logout, biometriaAtiva, definirBiometria } = useAuth();

  const [senhaAberta, setSenhaAberta] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);

  // Biometria: só oferecemos o toggle se o aparelho tem hardware + cadastro.
  const [biometriaOfertavel, setBiometriaOfertavel] = useState(false);
  const [alterandoBiometria, setAlterandoBiometria] = useState(false);
  useEffect(() => {
    biometriaDisponivel().then(setBiometriaOfertavel);
  }, []);

  async function aoAlternarBiometria(valor: boolean) {
    setAlterandoBiometria(true);
    try {
      const ok = await definirBiometria(valor);
      if (!ok && valor) {
        Alert.alert('Não foi possível ativar', 'A biometria não foi confirmada ou não está disponível.');
      }
    } finally {
      setAlterandoBiometria(false);
    }
  }

  function confirmarSair() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Cabeçalho com voltar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.voltar}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.titulo}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Segurança */}
        <Text style={styles.secaoTitulo}>Segurança</Text>
        <View style={styles.card}>
          <Pressable onPress={() => setSenhaAberta(true)} style={styles.linha}>
            <View style={styles.iconeWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={AZUL} />
            </View>
            <Text style={styles.linhaTexto}>Trocar senha</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          {biometriaOfertavel && (
            <View style={[styles.linha, styles.linhaBorda]}>
              <View style={styles.iconeWrap}>
                <Ionicons name="finger-print-outline" size={20} color={AZUL} />
              </View>
              <View style={styles.linhaTextoWrap}>
                <Text style={styles.linhaTexto}>Desbloqueio por biometria</Text>
                <Text style={styles.linhaSub}>Exigir biometria ao abrir o app</Text>
              </View>
              <Switch
                value={biometriaAtiva}
                onValueChange={aoAlternarBiometria}
                disabled={alterandoBiometria}
                trackColor={{ true: AZUL, false: '#E5E7EB' }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>

        {/* Conta */}
        <Text style={styles.secaoTitulo}>Conta</Text>
        <View style={styles.card}>
          <Pressable onPress={confirmarSair} style={styles.linha}>
            <View style={styles.iconeWrap}>
              <Ionicons name="log-out-outline" size={20} color={AZUL} />
            </View>
            <Text style={styles.linhaTexto}>Sair</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          <Pressable onPress={() => setExcluirAberto(true)} style={[styles.linha, styles.linhaBorda]}>
            <View style={[styles.iconeWrap, styles.iconeWrapPerigo]}>
              <Ionicons name="trash-outline" size={20} color="#B91C1C" />
            </View>
            <Text style={[styles.linhaTexto, styles.linhaTextoPerigo]}>Excluir minha conta</Text>
            <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
          </Pressable>
        </View>

        <Text style={styles.rodape}>Clínica Mais Saúde</Text>
      </ScrollView>

      <TrocarSenhaModal
        visivel={senhaAberta}
        onClose={() => setSenhaAberta(false)}
        onSuccess={() => {
          setSenhaAberta(false);
          Alert.alert('Pronto', 'Sua senha foi alterada.');
        }}
      />

      <ExcluirContaModal
        visivel={excluirAberto}
        onClose={() => setExcluirAberto(false)}
        onExcluida={() => {
          setExcluirAberto(false);
          Alert.alert('Conta excluída', 'Sua conta foi encerrada.');
          logout(true); // conta não existe mais: apaga tudo (sem re-login biométrico)
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  voltar: { padding: 4, marginLeft: -8 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  scroll: { padding: 20, paddingBottom: 40, gap: 8 },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  linhaBorda: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  iconeWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeWrapPerigo: { backgroundColor: '#FEF2F2' },
  linhaTexto: { flex: 1, fontSize: 15, fontWeight: '700', color: '#374151' },
  linhaTextoWrap: { flex: 1, gap: 2 },
  linhaTextoPerigo: { color: '#B91C1C' },
  linhaSub: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  rodape: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, fontWeight: '700', marginTop: 24 },
});
