import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/AuthContext';
import TrocarSenhaModal from '@/components/TrocarSenhaModal';
import { atualizarDados, obterPerfil } from '@/lib/perfil';
import { isEmailValido, isTelefoneValido, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/validadores';
import type { PacientePerfil } from '@/types/perfil';

const AZUL = '#2C5282';

// Dados pessoais do paciente: abre em modo leitura; o lápis do cabeçalho libera a edição de
// nome, e-mail e telefone. CPF e acompanhamento de memória são geridos pela clínica (só leitura).
// Fica no Stack raiz, como Configurações (ver o comentário em configuracoes.tsx).
export default function DadosPessoaisScreen() {
  const router = useRouter();
  const { session, atualizarNome } = useAuth();
  const [perfil, setPerfil] = useState<PacientePerfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [senhaAberta, setSenhaAberta] = useState(false);

  const preencherCampos = useCallback((p: PacientePerfil) => {
    setNome(p.nome ?? '');
    setEmail(p.email ?? '');
    setTelefone(mascaraTelefone(p.telefone));
  }, []);

  const carregar = useCallback(async () => {
    if (!session?.pacienteId) return;
    setErro(null);
    try {
      const p = await obterPerfil(session.pacienteId);
      setPerfil(p);
      preencherCampos(p);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar seus dados.');
    } finally {
      setCarregando(false);
    }
  }, [session?.pacienteId, preencherCampos]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const alterou =
    !!perfil &&
    (nome.trim() !== (perfil.nome ?? '') ||
      email.trim() !== (perfil.email ?? '') ||
      soDigitos(telefone) !== soDigitos(perfil.telefone));

  const podeSalvar = alterou && nome.trim().length > 0 && email.trim().length > 0 && !salvando;

  function cancelar() {
    if (perfil) preencherCampos(perfil);
    setEditando(false);
  }

  async function salvar() {
    if (!podeSalvar) return;
    // Validações locais antes de enviar (evita salvar dado malformado).
    if (!isEmailValido(email)) {
      Alert.alert('E-mail inválido', 'Informe um e-mail no formato nome@dominio.com.');
      return;
    }
    if (!isTelefoneValido(telefone)) {
      Alert.alert('Telefone inválido', 'Informe um telefone com DDD (10 ou 11 dígitos).');
      return;
    }
    setSalvando(true);
    try {
      const dados = { nome: nome.trim(), email: email.trim().toLowerCase(), telefone: soDigitos(telefone) };
      await atualizarDados(dados);
      const atualizado = perfil ? { ...perfil, ...dados } : perfil;
      setPerfil(atualizado);
      if (atualizado) preencherCampos(atualizado);
      await atualizarNome(dados.nome);
      setEditando(false);
      Alert.alert('Pronto', 'Seus dados foram atualizados.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.voltar}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.titulo}>Dados pessoais</Text>
        {!editando && perfil && (
          <Pressable
            onPress={() => setEditando(true)}
            hitSlop={10}
            style={styles.lapis}
            accessibilityRole="button"
            accessibilityLabel="Editar dados pessoais"
          >
            <Ionicons name="pencil" size={18} color={AZUL} />
          </Pressable>
        )}
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={AZUL} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {erro && (
              <View style={styles.erroBox}>
                <Text style={styles.erroTexto}>{erro}</Text>
                <Pressable onPress={carregar} style={styles.tentar}>
                  <Text style={styles.tentarTexto}>Tentar novamente</Text>
                </Pressable>
              </View>
            )}

            {perfil && (
              <>
                <View style={styles.card}>
                  {editando ? (
                    <>
                      <Text style={styles.label}>Nome</Text>
                      <TextInput value={nome} onChangeText={setNome} style={styles.input} editable={!salvando} autoFocus />

                      <Text style={[styles.label, styles.labelEspaco]}>E-mail</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                        editable={!salvando}
                      />

                      <Text style={[styles.label, styles.labelEspaco]}>Telefone</Text>
                      <TextInput
                        value={telefone}
                        onChangeText={(v) => setTelefone(mascaraTelefone(v))}
                        keyboardType="phone-pad"
                        placeholder="(00) 00000-0000"
                        placeholderTextColor="#9CA3AF"
                        maxLength={16}
                        style={styles.input}
                        editable={!salvando}
                      />

                      {/* Somente leitura também no modo edição: são geridos pela clínica. */}
                      <View style={styles.somenteLeitura}>
                        <Linha rotulo="CPF" valor={mascaraCpf(perfil.cpf)} />
                        <Linha rotulo="Acompanhamento de memória" valor={perfil.temProblemaMemoria ? 'Ativo' : 'Não'} ultima />
                      </View>

                      <View style={styles.acoes}>
                        <Pressable onPress={cancelar} disabled={salvando} style={[styles.botao, styles.botaoSecundario]}>
                          <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          onPress={salvar}
                          disabled={!podeSalvar}
                          style={[styles.botao, styles.botaoPrimario, !podeSalvar && styles.botaoOff]}
                        >
                          {salvando ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.botaoPrimarioTexto}>Salvar</Text>
                          )}
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Linha rotulo="Nome" valor={perfil.nome} />
                      <Linha rotulo="E-mail" valor={perfil.email} />
                      <Linha rotulo="Telefone" valor={mascaraTelefone(perfil.telefone) || '—'} />
                      <Linha rotulo="CPF" valor={mascaraCpf(perfil.cpf)} />
                      <Linha rotulo="Acompanhamento de memória" valor={perfil.temProblemaMemoria ? 'Ativo' : 'Não'} ultima />
                    </>
                  )}
                </View>
                <View style={styles.notaWrap}>
                  <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.nota}>
                    Para alterar o CPF ou o acompanhamento de memória, entre em contato com a clínica.
                  </Text>
                </View>

                {!editando && (
                  <Pressable
                    onPress={() => setSenhaAberta(true)}
                    style={({ pressed }) => [styles.card, styles.senha, pressed && styles.senhaPressionada]}
                  >
                    <View style={styles.senhaIcone}>
                      <Ionicons name="key-outline" size={20} color={AZUL} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.senhaTitulo}>Alterar senha</Text>
                      <Text style={styles.senhaSub}>Pede a senha atual para confirmar</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <TrocarSenhaModal
        visivel={senhaAberta}
        onClose={() => setSenhaAberta(false)}
        onSuccess={() => {
          setSenhaAberta(false);
          Alert.alert('Pronto', 'Sua senha foi alterada.');
        }}
      />
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor, ultima }: { rotulo: string; valor: string; ultima?: boolean }) {
  return (
    <View style={[styles.linha, !ultima && styles.linhaBorda]}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  voltar: { padding: 4, marginLeft: -8 },
  titulo: { flex: 1, fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  lapis: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },

  erroBox: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#FEF2F2' },
  erroTexto: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  tentar: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  tentarTexto: { color: AZUL, fontWeight: '800', fontSize: 13 },

  card: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  linha: { paddingVertical: 14, gap: 4 },
  linhaBorda: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  linhaRotulo: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  linhaValor: { fontSize: 16, fontWeight: '600', color: '#111827' },

  label: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  labelEspaco: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  somenteLeitura: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  botao: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  botaoPrimario: { backgroundColor: AZUL },
  botaoPrimarioTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  botaoSecundario: { backgroundColor: '#F3F4F6' },
  botaoSecundarioTexto: { color: '#374151', fontWeight: '800', fontSize: 15 },
  botaoOff: { opacity: 0.5 },

  senha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  senhaPressionada: { backgroundColor: '#F9FAFB' },
  senhaIcone: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  senhaTitulo: { fontSize: 15, fontWeight: '800', color: '#111827' },
  senhaSub: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },

  notaWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  nota: { flex: 1, fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
});
