import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
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

import { useAuth } from '@/auth/AuthContext';
import { CLINIC_NAME } from '@/constants/clinica';
import { solicitarRecuperacao, validarCodigo, redefinirSenha } from '@/lib/recuperacao';

const CODIGO_ALFABETO = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const SENHA_MIN = 8;

const AZUL = '#2C5282';
const AZUL_ESCURO = '#152D5C';

export default function LoginScreen() {
  const { login, trocarUsuario, lembrarUsuario, identificadorLembrado, nomeLembrado } = useAuth();
  const router = useRouter();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(lembrarUsuario);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modalEsqueci, setModalEsqueci] = useState(false);

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
    <ImageBackground
      source={require('../../../assets/images/itens_medicos_background.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <Image
                  source={require('../../../assets/images/logo_clinica.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.marca}>{CLINIC_NAME}</Text>
                <Text style={styles.subtitulo}>
                  {modoLembrado
                    ? `Olá${primeiroNome ? `, ${primeiroNome}` : ''}. Digite sua senha para entrar.`
                    : 'Faça login para acessar sua conta'}
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
                  <View style={styles.senhaWrap}>
                    <TextInput
                      value={senha}
                      onChangeText={setSenha}
                      placeholder="Digite sua senha"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!mostrarSenha}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      autoFocus={modoLembrado}
                      style={[styles.input, styles.inputSenha]}
                      editable={!entrando}
                      onSubmitEditing={handleEntrar}
                      returnKeyType="go"
                    />
                    <Pressable
                      onPress={() => setMostrarSenha((v) => !v)}
                      style={styles.olho}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>
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

                <View style={styles.rodape}>
                  <Pressable onPress={() => setModalEsqueci(true)} hitSlop={6}>
                    <Text style={styles.linkForte}>Esqueci minha senha</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/(auth)/auto-cadastro')} hitSlop={6} style={styles.cadastroLinha}>
                    <Text style={styles.cadastroTexto}>É novo por aqui? </Text>
                    <Text style={styles.linkForte}>Cadastre-se</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal: Esqueci a senha — fluxo funcional de recuperação por código */}
      <RecuperarSenhaModal visivel={modalEsqueci} onFechar={() => setModalEsqueci(false)} />
    </ImageBackground>
  );
}

type PassoRecuperacao = 'ident' | 'codigo' | 'senha' | 'ok';

function RecuperarSenhaModal({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  const [passo, setPasso] = useState<PassoRecuperacao>('ident');
  const [identificador, setIdentificador] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function fechar() {
    setPasso('ident'); setIdentificador(''); setCodigo(''); setResetToken('');
    setSenha(''); setConfirmar(''); setMostrar(false); setErro(null); setCarregando(false);
    onFechar();
  }

  async function enviar() {
    if (!identificador.trim()) return;
    setErro(null); setCarregando(true);
    try {
      await solicitarRecuperacao(identificador.trim());
      setPasso('codigo'); // resposta é genérica; avança independente do resultado
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.');
    } finally { setCarregando(false); }
  }

  async function validar() {
    if (codigo.length !== 6) { setErro('Digite os 6 caracteres do código.'); return; }
    setErro(null); setCarregando(true);
    try {
      const rt = await validarCodigo(identificador.trim(), codigo);
      setResetToken(rt); setPasso('senha');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Código inválido ou expirado.');
    } finally { setCarregando(false); }
  }

  async function redefinir() {
    if (senha.length < SENHA_MIN) { setErro(`A senha deve ter ao menos ${SENHA_MIN} caracteres.`); return; }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    setErro(null); setCarregando(true);
    try {
      await redefinirSenha(resetToken, senha); setPasso('ok');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível redefinir a senha.');
    } finally { setCarregando(false); }
  }

  const icone: keyof typeof Ionicons.glyphMap =
    passo === 'ident' ? 'key-outline'
    : passo === 'codigo' ? 'shield-checkmark-outline'
    : passo === 'senha' ? 'lock-closed-outline'
    : 'checkmark-circle-outline';
  const titulo =
    passo === 'ident' ? 'Recuperar senha'
    : passo === 'codigo' ? 'Digite o código'
    : passo === 'senha' ? 'Nova senha'
    : 'Senha redefinida';

  const botaoDesab =
    (passo === 'ident' && (carregando || !identificador.trim())) ||
    (passo === 'codigo' && (carregando || codigo.length !== 6)) ||
    (passo === 'senha' && carregando);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <Pressable onPress={fechar} style={styles.fechar} hitSlop={8}>
            <Ionicons name="close" size={22} color="#9CA3AF" />
          </Pressable>
          <View style={styles.modalIcone}>
            <Ionicons name={icone} size={28} color={AZUL} />
          </View>
          <Text style={styles.modalTitulo}>{titulo}</Text>

          <View style={styles.modalConteudo}>
            {passo === 'ident' && (
              <>
                <Text style={styles.modalSub}>
                  Informe seu CPF ou e-mail. Se a conta existir, enviaremos um código para o e-mail cadastrado.
                </Text>
                <TextInput
                  value={identificador}
                  onChangeText={setIdentificador}
                  placeholder="CPF ou e-mail"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  editable={!carregando}
                />
              </>
            )}

            {passo === 'codigo' && (
              <>
                <Text style={styles.modalSub}>
                  Enviamos um código de 6 caracteres para o e-mail cadastrado. Ele expira em 15 minutos.
                </Text>
                <TextInput
                  value={codigo}
                  onChangeText={(v) => setCodigo((v.toUpperCase().match(CODIGO_ALFABETO) || []).join('').slice(0, 6))}
                  placeholder="ABC123"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  style={[styles.input, styles.codigoInput]}
                  editable={!carregando}
                />
              </>
            )}

            {passo === 'senha' && (
              <>
                <Text style={styles.modalSub}>Defina sua nova senha (mínimo {SENHA_MIN} caracteres).</Text>
                <View style={styles.senhaWrap}>
                  <TextInput
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Nova senha"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!mostrar}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, styles.inputSenha]}
                    editable={!carregando}
                  />
                  <Pressable onPress={() => setMostrar((v) => !v)} style={styles.olho} hitSlop={8}>
                    <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                  </Pressable>
                </View>
                <TextInput
                  value={confirmar}
                  onChangeText={setConfirmar}
                  placeholder="Confirmar nova senha"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!mostrar}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  editable={!carregando}
                />
              </>
            )}

            {passo === 'ok' && (
              <Text style={styles.modalSub}>
                Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.
              </Text>
            )}

            {erro && <Text style={styles.erro}>{erro}</Text>}

            <Pressable
              onPress={passo === 'ident' ? enviar : passo === 'codigo' ? validar : passo === 'senha' ? redefinir : fechar}
              disabled={botaoDesab}
              style={[styles.modalBotao, botaoDesab && styles.botaoDesabilitado]}
            >
              {carregando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBotaoTexto}>
                  {passo === 'ident' ? 'Enviar código' : passo === 'codigo' ? 'Validar código' : passo === 'senha' ? 'Redefinir senha' : 'Entrar'}
                </Text>
              )}
            </Pressable>

            {passo === 'codigo' && (
              <Pressable onPress={() => { setPasso('ident'); setErro(null); setCodigo(''); }} style={styles.voltar} hitSlop={6}>
                <Text style={styles.voltarTexto}>Voltar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#EEF2F7' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    padding: 28,
    gap: 28,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  header: { alignItems: 'center', gap: 6 },
  logo: { width: 76, height: 76, marginBottom: 6 },
  marca: { fontSize: 26, fontWeight: '800', color: AZUL, letterSpacing: -0.5, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  senhaWrap: { position: 'relative', justifyContent: 'center' },
  inputSenha: { paddingRight: 48 },
  olho: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', paddingHorizontal: 4 },
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
  checkBoxOn: { backgroundColor: AZUL, borderColor: AZUL },
  checkTexto: { fontSize: 14, fontWeight: '600', color: '#374151' },
  erro: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  botao: {
    backgroundColor: AZUL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoPressionado: { opacity: 0.85 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  outraConta: { alignItems: 'center', paddingVertical: 8 },
  outraContaTexto: { color: AZUL, fontSize: 14, fontWeight: '700' },
  rodape: { alignItems: 'center', gap: 14, paddingTop: 6 },
  linkForte: { color: AZUL, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  cadastroLinha: { flexDirection: 'row', alignItems: 'center' },
  cadastroTexto: { color: '#6B7280', fontSize: 13, fontWeight: '500' },

  // Modais
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    maxHeight: '82%',
  },
  fechar: { position: 'absolute', right: 14, top: 14, padding: 6, zIndex: 2 },
  modalIcone: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  modalCorpo: { alignSelf: 'stretch' },
  modalCorpoInner: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    gap: 12,
  },
  bloco: { gap: 4 },
  blocoRotulo: { fontSize: 11, fontWeight: '800', color: AZUL, textTransform: 'uppercase', letterSpacing: 0.8 },
  blocoTexto: { fontSize: 14, fontWeight: '500', color: '#4B5563', lineHeight: 21 },
  blocoForte: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  divisor: { height: 1, backgroundColor: '#E5E7EB' },
  modalBotao: {
    backgroundColor: AZUL,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 18,
  },
  modalBotaoTexto: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  // Modal de recuperação de senha (multi-passo)
  modalConteudo: { width: '100%', gap: 14, marginTop: 4 },
  modalSub: { fontSize: 13, color: '#6B7280', fontWeight: '500', textAlign: 'center', lineHeight: 19 },
  codigoInput: { textAlign: 'center', fontSize: 22, fontWeight: '800', letterSpacing: 8 },
  voltar: { alignItems: 'center', paddingVertical: 4 },
  voltarTexto: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
});
