import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/auth/AuthContext';
import ExcluirContaModal from '@/components/ExcluirContaModal';
import TrocarSenhaModal from '@/components/TrocarSenhaModal';
import { biometriaDisponivel } from '@/lib/biometria';
import { atualizarDados, enviarFoto, obterPerfil } from '@/lib/perfil';
import type { PacientePerfil } from '@/types/perfil';

const AZUL = '#2C5282';

function formatarCpf(cpf: string): string {
  const d = (cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function PerfilScreen() {
  const { session, logout, atualizarNome, biometriaAtiva, definirBiometria } = useAuth();
  const [perfil, setPerfil] = useState<PacientePerfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

  // Campos editáveis (controlados).
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!session?.pacienteId) return;
    setErro(null);
    try {
      const p = await obterPerfil(session.pacienteId);
      setPerfil(p);
      setNome(p.nome ?? '');
      setEmail(p.email ?? '');
      setTelefone(p.telefone ?? '');
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
      telefone.trim() !== (perfil.telefone ?? ''));

  const podeSalvar = alterou && nome.trim().length > 0 && email.trim().length > 0 && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      const dados = { nome: nome.trim(), email: email.trim(), telefone: telefone.trim() };
      await atualizarDados(dados);
      setPerfil((prev) => (prev ? { ...prev, ...dados } : prev));
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

  function confirmarSair() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>Perfil</Text>

          {erro && (
            <View style={styles.erroBox}>
              <Text style={styles.erroTexto}>{erro}</Text>
              <Pressable onPress={carregar} style={styles.tentar}>
                <Text style={styles.tentarTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}

          {/* Avatar + foto */}
          <View style={styles.avatarWrap}>
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
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={styles.dica}>Toque para alterar a foto</Text>
          </View>

          {/* Dados editáveis */}
          <View style={styles.secao}>
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
              onChangeText={setTelefone}
              keyboardType="phone-pad"
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
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Informações da conta</Text>
            <View style={styles.linhaRO}>
              <Text style={styles.roLabel}>CPF</Text>
              <Text style={styles.roValor}>{perfil ? formatarCpf(perfil.cpf) : '—'}</Text>
            </View>
            <View style={styles.linhaRO}>
              <Text style={styles.roLabel}>Acompanhamento de memória</Text>
              <Text style={styles.roValor}>{perfil?.temProblemaMemoria ? 'Ativo' : 'Não'}</Text>
            </View>
            <Text style={styles.nota}>
              Estas informações são geridas pela equipe da clínica.
            </Text>
          </View>

          {/* Segurança */}
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Segurança</Text>
            <Pressable onPress={() => setSenhaAberta(true)} style={styles.linhaAcao}>
              <Ionicons name="lock-closed-outline" size={20} color="#374151" />
              <Text style={styles.linhaAcaoTexto}>Trocar senha</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            {biometriaOfertavel && (
              <View style={styles.linhaAcao}>
                <Ionicons name="finger-print-outline" size={20} color="#374151" />
                <View style={styles.biometriaTexto}>
                  <Text style={styles.linhaAcaoTexto}>Desbloqueio por biometria</Text>
                  <Text style={styles.biometriaSub}>Exigir biometria ao abrir o app</Text>
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

          {/* Zona de risco */}
          <View style={styles.secao}>
            <Pressable onPress={confirmarSair} style={styles.botaoSair}>
              <Text style={styles.botaoSairTexto}>Sair</Text>
            </Pressable>
            <Pressable onPress={() => setExcluirAberto(true)} style={styles.botaoExcluir}>
              <Text style={styles.botaoExcluirTexto}>Excluir minha conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingBottom: 40, gap: 20 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  erroBox: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#FEF2F2' },
  erroTexto: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  tentar: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  tentarTexto: { color: AZUL, fontWeight: '800', fontSize: 13 },

  avatarWrap: { alignItems: 'center', gap: 8 },
  avatarPress: { width: 96, height: 96 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  dica: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  secao: { gap: 8 },
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
  roLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', flex: 1 },
  roValor: { fontSize: 14, fontWeight: '700', color: '#111827' },
  nota: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 8 },

  linhaAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  linhaAcaoTexto: { flex: 1, fontSize: 15, fontWeight: '700', color: '#374151' },
  biometriaTexto: { flex: 1, gap: 2 },
  biometriaSub: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },

  botaoSair: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botaoSairTexto: { color: AZUL, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  botaoExcluir: {
    marginTop: 4,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  botaoExcluirTexto: { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
});
