import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cores } from '@/constants/tema';
import { mascaraCpf, soDigitos } from '@/lib/validadores';
import {
  solicitarPrimeiroAcesso,
  confirmarPrimeiroAcesso,
  definirSenhaPrimeiroAcesso,
} from '@/lib/primeiroAcesso';

const CODIGO_ALFABETO = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const SENHA_MIN = 8;

type Passo = 'ident' | 'codigo' | 'senha' | 'ok';

export default function PrimeiroAcessoScreen() {
  const router = useRouter();

  const [passo, setPasso] = useState<Passo>('ident');
  const [identificador, setIdentificador] = useState('');
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    if (!identificador.trim()) return;
    setErro(null); setCarregando(true);
    try {
      await solicitarPrimeiroAcesso(identificador.trim());
      // Pré-preenche o CPF se o identificador já for um CPF.
      if (soDigitos(identificador).length === 11) setCpf(mascaraCpf(identificador));
      setPasso('codigo');
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.');
    } finally { setCarregando(false); }
  }

  async function confirmar_() {
    if (codigo.length !== 6) { setErro('Digite os 6 caracteres do código.'); return; }
    if (soDigitos(cpf).length !== 11) { setErro('Confirme o seu CPF (11 dígitos).'); return; }
    setErro(null); setCarregando(true);
    try {
      const rt = await confirmarPrimeiroAcesso(soDigitos(cpf), codigo);
      setResetToken(rt); setPasso('senha');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Código inválido ou expirado.');
    } finally { setCarregando(false); }
  }

  async function definir() {
    if (senha.length < SENHA_MIN) { setErro(`A senha deve ter ao menos ${SENHA_MIN} caracteres.`); return; }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    setErro(null); setCarregando(true);
    try {
      await definirSenhaPrimeiroAcesso(resetToken, senha);
      setPasso('ok');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir o primeiro acesso.');
    } finally { setCarregando(false); }
  }

  const icone: keyof typeof Ionicons.glyphMap =
    passo === 'ident' ? 'mail-outline'
    : passo === 'codigo' ? 'shield-checkmark-outline'
    : passo === 'senha' ? 'lock-closed-outline'
    : 'checkmark-circle-outline';
  const titulo =
    passo === 'ident' ? 'Primeiro acesso'
    : passo === 'codigo' ? 'Confirme sua identidade'
    : passo === 'senha' ? 'Defina sua senha'
    : 'Conta criada';

  const acao = passo === 'ident' ? enviarCodigo : passo === 'codigo' ? confirmar_ : passo === 'senha' ? definir : () => router.replace('/(auth)/login');
  const rotulo = passo === 'ident' ? 'Enviar código' : passo === 'codigo' ? 'Confirmar' : passo === 'senha' ? 'Criar conta' : 'Ir para o login';
  const desab =
    (passo === 'ident' && (carregando || !identificador.trim())) ||
    (passo === 'codigo' && (carregando || codigo.length !== 6 || soDigitos(cpf).length !== 11)) ||
    (passo === 'senha' && carregando);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.voltarBtn}>
          <Ionicons name="chevron-back" size={24} color={cores.texto} />
        </Pressable>
        <Text style={styles.topoTitulo}>Primeiro acesso</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.icone}>
              <Ionicons name={icone} size={30} color={cores.primaria} />
            </View>
            <Text style={styles.titulo}>{titulo}</Text>

            <View style={styles.conteudo}>
              {passo === 'ident' && (
                <>
                  <Text style={styles.sub}>
                    Se o seu cadastro foi aprovado, informe o CPF ou e-mail cadastrado para receber um código de acesso.
                  </Text>
                  <TextInput value={identificador} onChangeText={setIdentificador} placeholder="CPF ou e-mail"
                    placeholderTextColor={cores.textoSuave} autoCapitalize="none" autoCorrect={false}
                    keyboardType="email-address" style={styles.input} editable={!carregando} />
                </>
              )}

              {passo === 'codigo' && (
                <>
                  <Text style={styles.sub}>
                    Enviamos um código de 6 caracteres ao e-mail cadastrado (expira em 15 minutos). Digite-o e confirme seu CPF.
                  </Text>
                  <TextInput
                    value={codigo}
                    onChangeText={(v) => setCodigo((v.toUpperCase().match(CODIGO_ALFABETO) || []).join('').slice(0, 6))}
                    placeholder="ABC123" placeholderTextColor={cores.textoSuave} autoCapitalize="characters"
                    autoCorrect={false} maxLength={6} style={[styles.input, styles.codigoInput]} editable={!carregando} />
                  <TextInput value={cpf} onChangeText={(v) => setCpf(mascaraCpf(v))} placeholder="CPF (000.000.000-00)"
                    placeholderTextColor={cores.textoSuave} keyboardType="number-pad" maxLength={14}
                    style={styles.input} editable={!carregando} />
                </>
              )}

              {passo === 'senha' && (
                <>
                  <Text style={styles.sub}>Defina a senha de acesso (mínimo {SENHA_MIN} caracteres).</Text>
                  <View style={styles.senhaWrap}>
                    <TextInput value={senha} onChangeText={setSenha} placeholder="Nova senha" placeholderTextColor={cores.textoSuave}
                      secureTextEntry={!mostrar} autoCapitalize="none" autoCorrect={false}
                      style={[styles.input, styles.inputSenha]} editable={!carregando} />
                    <Pressable onPress={() => setMostrar((v) => !v)} style={styles.olho} hitSlop={8}>
                      <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={20} color={cores.textoSuave} />
                    </Pressable>
                  </View>
                  <TextInput value={confirmar} onChangeText={setConfirmar} placeholder="Confirmar nova senha"
                    placeholderTextColor={cores.textoSuave} secureTextEntry={!mostrar} autoCapitalize="none"
                    autoCorrect={false} style={styles.input} editable={!carregando} />
                </>
              )}

              {passo === 'ok' && (
                <Text style={styles.sub}>
                  Sua conta foi criada com sucesso. Você já pode entrar com o seu CPF/e-mail e a senha definida.
                </Text>
              )}

              {erro && <Text style={styles.erro}>{erro}</Text>}

              <Pressable onPress={acao} disabled={desab} style={[styles.botao, desab && styles.botaoDesab]}>
                {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>{rotulo}</Text>}
              </Pressable>

              {passo === 'codigo' && (
                <Pressable onPress={() => { setPasso('ident'); setErro(null); setCodigo(''); }} style={styles.voltar} hitSlop={6}>
                  <Text style={styles.voltarTexto}>Voltar</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cores.fundo },
  flex: { flex: 1 },
  topo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  voltarBtn: { padding: 2 },
  topoTitulo: { fontSize: 17, fontWeight: '800', color: cores.texto },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: cores.superficie, borderRadius: 24, padding: 26, alignItems: 'center',
    borderWidth: 1, borderColor: cores.borda,
  },
  icone: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: cores.primariaTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  titulo: { fontSize: 19, fontWeight: '800', color: cores.texto, marginBottom: 16, textAlign: 'center' },
  conteudo: { width: '100%', gap: 14 },
  sub: { fontSize: 13, color: cores.textoSecundario, fontWeight: '500', textAlign: 'center', lineHeight: 19 },
  input: {
    borderWidth: 1, borderColor: cores.borda, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '600', color: cores.texto, backgroundColor: cores.neutroSuave,
  },
  codigoInput: { textAlign: 'center', fontSize: 22, fontWeight: '800', letterSpacing: 8 },
  senhaWrap: { position: 'relative', justifyContent: 'center' },
  inputSenha: { paddingRight: 48 },
  olho: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', paddingHorizontal: 4 },
  erro: { color: cores.erro, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  botao: { backgroundColor: cores.primaria, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  botaoDesab: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  voltar: { alignItems: 'center', paddingVertical: 4 },
  voltarTexto: { color: cores.textoSecundario, fontSize: 13, fontWeight: '700' },
});
