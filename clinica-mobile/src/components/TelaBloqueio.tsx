import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/AuthContext';

const ROXO = '#7C3AED';

// Cobre o app quando há sessão salva mas ele está bloqueado por biometria.
// Dispara o prompt quando o app está em foco; permite tentar de novo, cair para
// a senha da conta, ou sair.
export default function TelaBloqueio() {
  const { session, desbloquear, desbloquearComSenha, logout } = useAuth();
  const [tentando, setTentando] = useState(false);
  const [modoSenha, setModoSenha] = useState(false);
  const [senha, setSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  // Refs para o listener de AppState enxergar o estado atual sem re-inscrever.
  const tentandoRef = useRef(false);
  const modoSenhaRef = useRef(false);

  useEffect(() => {
    modoSenhaRef.current = modoSenha;
  }, [modoSenha]);

  async function tentar() {
    // Evita chamadas concorrentes ao prompt nativo (causa travamento no Android)
    // e não dispara biometria enquanto o paciente está no modo senha.
    if (tentandoRef.current || modoSenhaRef.current) return;
    tentandoRef.current = true;
    setTentando(true);
    try {
      await desbloquear();
    } finally {
      tentandoRef.current = false;
      setTentando(false);
    }
  }

  async function entrarComSenha() {
    if (senha.length === 0 || tentandoRef.current) return;
    setErroSenha(null);
    tentandoRef.current = true;
    setTentando(true);
    try {
      const ok = await desbloquearComSenha(senha);
      if (!ok) setErroSenha('Senha incorreta. Tente novamente.');
      else setSenha('');
    } finally {
      tentandoRef.current = false;
      setTentando(false);
    }
  }

  // Dispara o prompt SÓ quando o app está em foco ('active'). Ao voltar do
  // segundo plano, o prompt nativo trava se chamado durante a transição — por
  // isso esperamos o estado 'active' (agora e nas próximas transições).
  useEffect(() => {
    if (AppState.currentState === 'active') tentar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') tentar();
    });
    return () => sub.remove();
  }, []);

  const primeiroNome = (session?.nome || '').trim().split(' ')[0];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.corpo}>
          <View style={styles.icone}>
            <Ionicons name="lock-closed" size={40} color={ROXO} />
          </View>
          <Text style={styles.titulo}>App bloqueado</Text>
          <Text style={styles.sub}>
            {primeiroNome ? `Olá, ${primeiroNome}. ` : ''}
            {modoSenha ? 'Digite sua senha para continuar.' : 'Use sua biometria para continuar.'}
          </Text>

          {modoSenha ? (
            <View style={styles.formSenha}>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="Sua senha"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoFocus
                style={styles.input}
                editable={!tentando}
                onSubmitEditing={entrarComSenha}
                returnKeyType="go"
              />
              {erroSenha && <Text style={styles.erro}>{erroSenha}</Text>}
              <Pressable
                onPress={entrarComSenha}
                disabled={senha.length === 0 || tentando}
                style={({ pressed }) => [
                  styles.botao,
                  (senha.length === 0 || tentando) && styles.botaoOff,
                  pressed && senha.length > 0 && !tentando && { opacity: 0.85 },
                ]}
              >
                {tentando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar</Text>}
              </Pressable>
              <Pressable onPress={() => { setModoSenha(false); setErroSenha(null); }} style={styles.alternar}>
                <Ionicons name="finger-print" size={16} color={ROXO} />
                <Text style={styles.alternarTexto}>Usar biometria</Text>
              </Pressable>
            </View>
          ) : (
            <>
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
              <Pressable onPress={() => setModoSenha(true)} style={styles.alternar}>
                <Ionicons name="key-outline" size={16} color={ROXO} />
                <Text style={styles.alternarTexto}>Usar senha</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable onPress={() => logout(true)} style={styles.sair}>
          <Text style={styles.sairTexto}>Sair da conta</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Cobre toda a tela por cima da navegação (que segue montada por baixo).
  safe: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 10 },
  flex: { flex: 1 },
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
  formSenha: { width: '100%', gap: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  erro: { color: '#DC2626', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: ROXO,
  },
  botaoOff: { opacity: 0.5, marginTop: 0 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
  alternar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
  alternarTexto: { color: ROXO, fontSize: 14, fontWeight: '700' },
  sair: { alignItems: 'center', paddingVertical: 20 },
  sairTexto: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
