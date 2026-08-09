import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';

import {
  ESPECIALIDADE_LABEL,
  STATUS_ATIVOS,
  STATUS_CANCELAVEIS,
  STATUS_INFO,
  TIPO_CONSULTA_LABEL,
} from '@/constants/agendamento';
import RemarcarModal from '@/components/RemarcarModal';
import { cancelarConsulta, listarMinhasConsultas } from '@/lib/agendamentos';
import { formatarDataHora } from '@/lib/datas';
import type { Agendamento } from '@/types/agendamento';

const ROXO = '#7C3AED';
type Aba = 'proximas' | 'historico';

export default function MinhasConsultasScreen() {
  const [consultas, setConsultas] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('proximas');
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [remarcarAlvo, setRemarcarAlvo] = useState<Agendamento | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setConsultas(await listarMinhasConsultas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar consultas.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  // Recarrega sempre que a aba ganha foco (ex.: ao voltar de outra tela).
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const onRefresh = useCallback(() => {
    setAtualizando(true);
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    return consultas.filter((c) =>
      aba === 'proximas' ? STATUS_ATIVOS.includes(c.status) : !STATUS_ATIVOS.includes(c.status),
    );
  }, [consultas, aba]);

  function confirmarCancelamento(item: Agendamento) {
    Alert.alert(
      'Cancelar consulta',
      `Deseja cancelar a consulta com ${item.nomeProfissional} em ${formatarDataHora(item.dataHoraConsulta)}?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: () => cancelar(item.id) },
      ],
    );
  }

  async function cancelar(id: string) {
    setCancelandoId(id);
    try {
      await cancelarConsulta(id);
      await carregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível cancelar.');
    } finally {
      setCancelandoId(null);
    }
  }

  function renderItem({ item }: { item: Agendamento }) {
    const status = STATUS_INFO[item.status] ?? { label: item.status, cor: '#6B7280', fundo: '#F3F4F6' };
    const tipo = TIPO_CONSULTA_LABEL[item.tipoConsulta] ?? item.tipoConsulta;
    const esp = item.especialidade ? ESPECIALIDADE_LABEL[item.especialidade] ?? item.especialidade : null;
    const podeCancelar = STATUS_CANCELAVEIS.includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardTopo}>
          <Text style={styles.profissional}>{item.nomeProfissional}</Text>
          <View style={[styles.badge, { backgroundColor: status.fundo }]}>
            <Text style={[styles.badgeTexto, { color: status.cor }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.tipo}>
          {tipo}
          {esp ? ` · ${esp}` : ''}
        </Text>
        <Text style={styles.data}>{formatarDataHora(item.dataHoraConsulta)}</Text>

        {podeCancelar && (
          <View style={styles.acoes}>
            <Pressable
              onPress={() => setRemarcarAlvo(item)}
              style={({ pressed }) => [styles.botaoRemarcar, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.botaoRemarcarTexto}>Remarcar</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmarCancelamento(item)}
              disabled={cancelandoId === item.id}
              style={({ pressed }) => [styles.botaoCancelar, pressed && { opacity: 0.7 }]}
            >
              {cancelandoId === item.id ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Minhas Consultas</Text>
      </View>

      <View style={styles.chips}>
        {(['proximas', 'historico'] as Aba[]).map((a) => (
          <Pressable key={a} onPress={() => setAba(a)} style={[styles.chip, aba === a && styles.chipAtivo]}>
            <Text style={[styles.chipTexto, aba === a && styles.chipTextoAtivo]}>
              {a === 'proximas' ? 'Próximas' : 'Histórico'}
            </Text>
          </Pressable>
        ))}
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
          data={filtradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={ROXO} />}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                {aba === 'proximas' ? 'Você não tem consultas próximas.' : 'Nenhuma consulta no histórico.'}
              </Text>
            </View>
          }
        />
      )}

      <RemarcarModal
        agendamento={remarcarAlvo}
        onClose={() => setRemarcarAlvo(null)}
        onSuccess={() => {
          setRemarcarAlvo(null);
          carregar();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingVertical: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F3F4F6' },
  chipAtivo: { backgroundColor: ROXO },
  chipTexto: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  chipTextoAtivo: { color: '#fff' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  erro: { color: '#B91C1C', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  tentar: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  tentarTexto: { color: ROXO, fontWeight: '800', fontSize: 13 },
  lista: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
    gap: 6,
    backgroundColor: '#fff',
  },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  profissional: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTexto: { fontSize: 11, fontWeight: '800' },
  tipo: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  data: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 8 },
  botaoRemarcar: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  botaoRemarcarTexto: { color: '#6D28D9', fontWeight: '800', fontSize: 13 },
  botaoCancelar: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  botaoCancelarTexto: { color: '#B91C1C', fontWeight: '800', fontSize: 13 },
  vazio: { padding: 40, alignItems: 'center' },
  vazioTexto: { color: '#9CA3AF', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
