import { useState } from 'react';
import {
  ActivityIndicator,
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

export default function LoginScreen() {
  const { login, trocarUsuario, lembrarUsuario, identificadorLembrado, nomeLembrado } = useAuth();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(lembrarUsuario);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // Modo "só senha": há um usuário lembrado (identificador + nome).
  const modoLembrado = !!identificadorLembrado;
  const identEfetivo = modoLembrado ? identificadorLembrado : identificador.trim();
  const podeEntrar = identEfetivo.length > 0 && senha.length > 0 && !entrando;

  async function handleEntrar() {
    if (!podeEntrar) return;
    setErro(null);
    setEntrando(true);
    try {
      await login(identEfetivo, senha, lembrar);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEntrando(false);
    }
  }

  async function usarOutraConta() {
    setSenha('');
    setErro(null);
    await trocarUsuario();
  }

  const primeiroNome = (nomeLembrado || '').trim().split(' ')[0];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.marca}>Clínica Mais Saúde</Text>
            <Text style={styles.subtitulo}>
              {modoLembrado
                ? `Olá${primeiroNome ? `, ${primeiroNome}` : ''}. Digite sua senha para entrar.`
                : 'Acesse sua conta de paciente'}
            </Text>
          </View>

          <View style={styles.form}>
            {!modoLembrado && (
              <View style={styles.campo}>
                <Text style={styles.label}>CPF ou e-mail</Text>
                <TextInput
                  value={identificador}
                  onChangeText={setIdentificador}
                  placeholder="Digite seu CPF ou e-mail"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  editable={!entrando}
                />
              </View>
            )}

            <View style={styles.campo}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="Digite sua senha"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoFocus={modoLembrado}
                style={styles.input}
                editable={!entrando}
                onSubmitEditing={handleEntrar}
                returnKeyType="go"
              />
            </View>

            {/* Checkbox: Lembrar usuário */}
            <Pressable onPress={() => setLembrar((v) => !v)} style={styles.check} hitSlop={6}>
              <View style={[styles.checkBox, lembrar && styles.checkBoxOn]}>
                {lembrar && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkTexto}>Lembrar usuário</Text>
            </Pressable>

            {erro && <Text style={styles.erro}>{erro}</Text>}

            <Pressable
              onPress={handleEntrar}
              disabled={!podeEntrar}
              style={({ pressed }) => [
                styles.botao,
                !podeEntrar && styles.botaoDesabilitado,
                pressed && podeEntrar && styles.botaoPressionado,
              ]}
            >
              {entrando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar</Text>}
            </Pressable>

            {modoLembrado && (
              <Pressable onPress={usarOutraConta} style={styles.outraConta} disabled={entrando}>
                <Text style={styles.outraContaTexto}>Entrar com outra conta</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 40 },
  header: { gap: 8 },
  marca: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  form: { gap: 18 },
  campo: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
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
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4, paddingVertical: 2 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: ROXO, borderColor: ROXO },
  checkTexto: { fontSize: 14, fontWeight: '600', color: '#374151' },
  erro: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  botao: {
    backgroundColor: ROXO,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoPressionado: { opacity: 0.85 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  outraConta: { alignItems: 'center', paddingVertical: 8 },
  outraContaTexto: { color: ROXO, fontSize: 14, fontWeight: '700' },
});
