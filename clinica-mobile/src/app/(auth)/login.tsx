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

import { useAuth } from '@/auth/AuthContext';

const ROXO = '#7C3AED';

export default function LoginScreen() {
  const { login } = useAuth();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const podeEntrar = identificador.trim().length > 0 && senha.length > 0 && !entrando;

  async function handleEntrar() {
    if (!podeEntrar) return;
    setErro(null);
    setEntrando(true);
    try {
      await login(identificador.trim(), senha);
      // A navegação (guard na raiz) redireciona ao (app) ao detectar a sessão.
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.marca}>Clínica Mais Saúde</Text>
            <Text style={styles.subtitulo}>Acesse sua conta de paciente</Text>
          </View>

          <View style={styles.form}>
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

            <View style={styles.campo}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="Digite sua senha"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={styles.input}
                editable={!entrando}
                onSubmitEditing={handleEntrar}
                returnKeyType="go"
              />
            </View>

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
              {entrando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botaoTexto}>Entrar</Text>
              )}
            </Pressable>
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
});
