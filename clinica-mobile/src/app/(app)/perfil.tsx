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
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/auth/AuthContext';
import { atualizarDados, enviarFoto, obterPerfil } from '@/lib/perfil';
import { isEmailValido, isTelefoneValido, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/validadores';
import type { PacientePerfil } from '@/types/perfil';

const AZUL = '#2C5282';

export default function PerfilScreen() {
  const { session, atualizarNome } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState<PacientePerfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Campos editáveis (controlados).
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const carregar = useCallback(async () => {
    if (!session?.pacienteId) return;
    setErro(null);
    try {
      const p = await obterPerfil(session.pacienteId);
      setPerfil(p);
      setNome(p.nome ?? '');
      setEmail(p.email ?? '');
      setTelefone(mascaraTelefone(p.telefone));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o perfil.');
    } finally {
      setCarregando(false);
    }
  }, [session?.pacienteId]);

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
      setPerfil((prev) => (prev ? { ...prev, ...dados } : prev));
      // Reflete os valores normalizados nos campos (evita "alterou" fantasma).
      setEmail(dados.email);
      setTelefone(mascaraTelefone(dados.telefone));
      await atualizarNome(dados.nome);
      Alert.alert('Pronto', 'Seus dados foram atualizados.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function escolherFoto() {
    Alert.alert('Foto de perfil', 'De onde você quer escolher?', [
      { text: 'Câmera', onPress: () => pegarFoto('camera') },
      { text: 'Galeria', onPress: () => pegarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function pegarFoto(origem: 'camera' | 'galeria') {
    try {
      const perm =
        origem === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso para escolher uma foto.');
        return;
      }

      const opcoes: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      };
      const res =
        origem === 'camera'
          ? await ImagePicker.launchCameraAsync(opcoes)
          : await ImagePicker.launchImageLibraryAsync(opcoes);

      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      setEnviandoFoto(true);
      const novaFoto = await enviarFoto(asset.uri, asset.mimeType);
      setPerfil((prev) => (prev ? { ...prev, fotoBase64: novaFoto } : prev));
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  const inicial = (nome || session?.nome || 'P').charAt(0).toUpperCase();

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centro}>
          <ActivityIndicator color={AZUL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Cabeçalho: título + atalho de configurações */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil</Text>
        <Pressable onPress={() => router.navigate('/(app)/configuracoes')} hitSlop={10} style={styles.gear}>
          <Ionicons name="settings-outline" size={22} color="#374151" />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {erro && (
            <View style={styles.erroBox}>
              <Text style={styles.erroTexto}>{erro}</Text>
              <Pressable onPress={carregar} style={styles.tentar}>
                <Text style={styles.tentarTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}

          {/* Cartão de identidade: avatar + nome + e-mail */}
          <View style={styles.identidade}>
            <Pressable onPress={escolherFoto} disabled={enviandoFoto} style={styles.avatarPress}>
              {perfil?.fotoBase64 ? (
                <Image source={{ uri: perfil.fotoBase64 }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>{inicial}</Text>
                </View>
              )}
              <View style={styles.camera}>
                {enviandoFoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={15} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={styles.identNome} numberOfLines={1}>
              {nome || session?.nome || 'Paciente'}
            </Text>
            {!!(email || perfil?.email) && (
              <Text style={styles.identEmail} numberOfLines={1}>
                {email || perfil?.email}
              </Text>
            )}
          </View>

          {/* Dados editáveis */}
          <View style={styles.card}>
            <Text style={styles.secaoTitulo}>Seus dados</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput value={nome} onChangeText={setNome} style={styles.input} editable={!salvando} />

            <Text style={[styles.label, { marginTop: 12 }]}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              editable={!salvando}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Telefone</Text>
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

            <Pressable
              onPress={salvar}
              disabled={!podeSalvar}
              style={({ pressed }) => [styles.botaoSalvar, !podeSalvar && styles.botaoOff, pressed && podeSalvar && { opacity: 0.85 }]}
            >
              {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>}
            </Pressable>
          </View>

          {/* Read-only */}
          <View style={styles.card}>
            <Text style={styles.secaoTitulo}>Informações da conta</Text>
            <View style={styles.linhaRO}>
              <Text style={styles.roLabel}>CPF</Text>
              <Text style={styles.roValor}>{perfil ? mascaraCpf(perfil.cpf) : '—'}</Text>
            </View>
            <View style={[styles.linhaRO, styles.linhaROultima]}>
              <Text style={styles.roLabel}>Acompanhamento de memória</Text>
              <Text style={styles.roValor}>{perfil?.temProblemaMemoria ? 'Ativo' : 'Não'}</Text>
            </View>
            <Text style={styles.nota}>Estas informações são geridas pela equipe da clínica.</Text>
          </View>

          {/* Configurações */}
          <Pressable onPress={() => router.navigate('/(app)/configuracoes')} style={styles.configBtn}>
            <View style={styles.configIcone}>
              <Ionicons name="settings-outline" size={20} color={AZUL} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.configTitulo}>Configurações</Text>
              <Text style={styles.configSub}>Segurança, biometria, conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  gear: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  scroll: { padding: 24, paddingTop: 12, paddingBottom: 40, gap: 16 },
  erroBox: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#FEF2F2' },
  erroTexto: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  tentar: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  tentarTexto: { color: AZUL, fontWeight: '800', fontSize: 13 },

  identidade: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatarPress: { width: 96, height: 96, marginBottom: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF2F7' },
  avatarTexto: { fontSize: 38, fontWeight: '800', color: AZUL },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AZUL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  identNome: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  identEmail: { fontSize: 14, fontWeight: '500', color: '#6B7280' },

  card: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 18, padding: 16, gap: 8 },
  secaoTitulo: { fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
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
  botaoSalvar: { marginTop: 16, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: AZUL },
  botaoOff: { opacity: 0.5 },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },

  linhaRO: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linhaROultima: { borderBottomWidth: 0 },
  roLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', flex: 1 },
  roValor: { fontSize: 14, fontWeight: '700', color: '#111827' },
  nota: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 4 },

  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  configIcone: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  configTitulo: { fontSize: 15, fontWeight: '800', color: '#111827' },
  configSub: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
});
