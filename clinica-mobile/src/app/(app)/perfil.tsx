import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, type AlertButton, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/auth/AuthContext';
import { enviarFoto, obterPerfil, removerFoto } from '@/lib/perfil';
import type { PacientePerfil } from '@/types/perfil';

const AZUL = '#2C5282';

// Perfil: só foto e nome no topo, e um menu para as telas de detalhe (dados pessoais e
// configurações). A edição dos dados fica em "Dados pessoais", atrás do ícone de lápis.
export default function PerfilScreen() {
  const { session, semBloqueio } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState<PacientePerfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const carregar = useCallback(async () => {
    if (!session?.pacienteId) return;
    setErro(null);
    try {
      setPerfil(await obterPerfil(session.pacienteId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o perfil.');
    } finally {
      setCarregando(false);
    }
  }, [session?.pacienteId]);

  // Recarrega ao voltar para a aba (ex.: depois de editar os dados pessoais).
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  function escolherFoto() {
    const opcoes: AlertButton[] = [
      { text: 'Câmera', onPress: () => pegarFoto('camera') },
      { text: 'Galeria', onPress: () => pegarFoto('galeria') },
    ];
    // Só oferece remover quando já existe uma foto.
    if (perfil?.fotoBase64) {
      opcoes.push({ text: 'Remover foto atual', style: 'destructive', onPress: confirmarRemocaoFoto });
    }
    opcoes.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Foto de perfil', 'O que você quer fazer?', opcoes);
  }

  function confirmarRemocaoFoto() {
    Alert.alert(
      'Remover foto',
      'Sua foto será removida e voltaremos a exibir a inicial do seu nome.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: removerFotoAtual },
      ],
    );
  }

  async function removerFotoAtual() {
    try {
      setEnviandoFoto(true);
      await removerFoto();
      setPerfil((prev) => (prev ? { ...prev, fotoBase64: null } : prev));
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível remover a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function pegarFoto(origem: 'camera' | 'galeria') {
    try {
      // A galeria e a câmera levam o app para o segundo plano: sem o semBloqueio, a
      // biometria seria pedida de novo ao voltar com a foto.
      const res = await semBloqueio(async () => {
        const perm =
          origem === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Autorize o acesso para escolher uma foto.');
          return null;
        }

        const opcoes: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        };
        return origem === 'camera'
          ? await ImagePicker.launchCameraAsync(opcoes)
          : await ImagePicker.launchImageLibraryAsync(opcoes);
      });

      if (!res || res.canceled || !res.assets?.[0]) return;
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

  const nome = perfil?.nome || session?.nome || 'Paciente';
  const inicial = nome.charAt(0).toUpperCase();

  const itens: { icone: keyof typeof Ionicons.glyphMap; titulo: string; sub: string; rota: Href }[] = [
    { icone: 'person-outline', titulo: 'Dados pessoais', sub: 'Nome, e-mail, telefone e senha', rota: '/dados-pessoais' },
    { icone: 'settings-outline', titulo: 'Configurações', sub: 'Biometria, sair e excluir conta', rota: '/configuracoes' },
  ];

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
      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {erro && (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <Pressable onPress={carregar} style={styles.tentar}>
              <Text style={styles.tentarTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {/* Identidade: foto (toque para trocar) + nome */}
        <View style={styles.identidade}>
          <Pressable
            onPress={escolherFoto}
            disabled={enviandoFoto}
            style={styles.avatarPress}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
          >
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
            {nome}
          </Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {itens.map((item, i) => (
            <Pressable
              key={item.titulo}
              onPress={() => router.push(item.rota)}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorda, pressed && styles.itemPressionado]}
            >
              <View style={styles.itemIcone}>
                <Ionicons name={item.icone} size={20} color={AZUL} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemTitulo}>{item.titulo}</Text>
                <Text style={styles.itemSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  scroll: { padding: 24, paddingTop: 12, paddingBottom: 40, gap: 24 },
  erroBox: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#FEF2F2' },
  erroTexto: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  tentar: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  tentarTexto: { color: AZUL, fontWeight: '800', fontSize: 13 },

  identidade: { alignItems: 'center', gap: 10, paddingTop: 8 },
  avatarPress: { width: 104, height: 104 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#EEF2F7' },
  avatarTexto: { fontSize: 42, fontWeight: '800', color: AZUL },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AZUL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  identNome: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },

  menu: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 18, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  itemBorda: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  itemPressionado: { backgroundColor: '#F9FAFB' },
  itemIcone: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  itemTitulo: { fontSize: 15, fontWeight: '800', color: '#111827' },
  itemSub: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
});
