import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { tempoRelativo } from '@/lib/datas';
import {
  listarNotificacoes,
  marcarComoLida,
  removerNotificacao,
} from '@/lib/notificacoes';
import type { Notificacao } from '@/types/notificacao';

const ROXO = '#7C3AED';

export default function NotificacoesScreen() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setNotificacoes(await listarNotificacoes());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar notificações.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const onRefresh = useCallback(() => {
    setAtualizando(true);
    carregar();
  }, [carregar]);

  // Toque: marca como lida (otimista) e, se a notificação aponta para uma
  // consulta, leva o paciente para a aba Consultas.
  async function aoTocar(item: Notificacao) {
    if (!item.lida) {
      setNotificacoes((prev) => prev.map((n) => (n.id === item.id ? { ...n, lida: true } : n)));
      try {
        await marcarComoLida(item.id);
      } catch {
        // Se falhar, reverte o estado de lida na próxima recarga; não bloqueia a navegação.
      }
    }
    if (item.agendamentoId) {
      router.navigate('/(app)');
    }
  }

  async function remover(item: Notificacao) {
    const anterior = notificacoes;
    setNotificacoes((prev) => prev.filter((n) => n.id !== item.id));
    try {
      await removerNotificacao(item.id);
    } catch (e) {
      setNotificacoes(anterior); // desfaz a remoção otimista
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível remover.');
    }
  }

  function renderItem({ item }: { item: Notificacao }) {
    return (
      <Pressable
        onPress={() => aoTocar(item)}
        style={({ pressed }) => [styles.card, !item.lida && styles.cardNaoLida, pressed && styles.cardPressionado]}
      >
        {!item.lida && <View style={styles.pontoNaoLida} />}
        <View style={styles.cardConteudo}>
          <View style={styles.cardTopo}>
            <Text style={[styles.titulo, !item.lida && styles.tituloNaoLida]} numberOfLines={1}>
              {item.titulo}
            </Text>
            <Text style={styles.tempo}>{tempoRelativo(item.dtCriado)}</Text>
          </View>
          <Text style={styles.mensagem}>{item.mensagem}</Text>
        </View>
        <Pressable onPress={() => remover(item)} hitSlop={10} style={styles.lixeira}>
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.tituloTela}>Notificações</Text>
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={ROXO} />
        </View>
      ) : erro ? (
        <View style={styles.centro}>
          <Text style={styles.erro}>{erro}</Text>
          <Pressable onPress={carregar} style={styles.tentar}>
            <Text style={styles.tentarTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={ROXO} />}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Ionicons name="notifications-off-outline" size={40} color="#D1D5DB" />
              <Text style={styles.vazioTexto}>Você não tem notificações.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  tituloTela: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  erro: { color: '#B91C1C', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  tentar: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  tentarTexto: { color: ROXO, fontWeight: '800', fontSize: 13 },
  lista: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
  },
  cardNaoLida: { backgroundColor: '#FaF5FF', borderColor: '#EDE9FE' },
  cardPressionado: { opacity: 0.7 },
  pontoNaoLida: { width: 8, height: 8, borderRadius: 999, backgroundColor: ROXO, marginTop: 6 },
  cardConteudo: { flex: 1, gap: 4 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#374151', flex: 1 },
  tituloNaoLida: { fontWeight: '800', color: '#111827' },
  tempo: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  mensagem: { fontSize: 14, fontWeight: '500', color: '#4B5563', lineHeight: 20 },
  lixeira: { padding: 4 },
  vazio: { padding: 48, alignItems: 'center', gap: 12 },
  vazioTexto: { color: '#9CA3AF', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
