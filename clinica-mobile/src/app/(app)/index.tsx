import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/AuthContext';
import { useNaoLidas } from '@/context/NaoLidasContext';
import { ESPECIALIDADE_LABEL, STATUS_ATIVOS, TIPO_CONSULTA_LABEL } from '@/constants/agendamento';
import { listarMinhasConsultas } from '@/lib/agendamentos';
import { formatarDataHora, parseData } from '@/lib/datas';
import type { Agendamento } from '@/types/agendamento';

const ROXO = '#7C3AED';

function saudacaoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Próxima consulta = a consulta ativa mais próxima no futuro (menor data ainda por vir).
function proximaConsulta(consultas: Agendamento[]): Agendamento | null {
  const agora = Date.now();
  const futuras = consultas
    .filter((c) => STATUS_ATIVOS.includes(c.status))
    .map((c) => ({ c, t: parseData(c.dataHoraConsulta)?.getTime() ?? 0 }))
    .filter((x) => x.t >= agora)
    .sort((a, b) => a.t - b.t);
  return futuras[0]?.c ?? null;
}

export default function InicioScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { naoLidas, atualizar: atualizarNaoLidas } = useNaoLidas();
  const [proxima, setProxima] = useState<Agendamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const primeiroNome = (session?.nome ?? '').trim().split(/\s+/)[0] || 'paciente';

  const carregar = useCallback(async () => {
    // A Home é um resumo: falha de rede não deve travar a tela, só zera os cartões.
    try {
      const consultas = await listarMinhasConsultas().catch(() => [] as Agendamento[]);
      setProxima(proximaConsulta(consultas));
      await atualizarNaoLidas(); // mantém o badge (Home e aba Avisos) em dia
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [atualizarNaoLidas]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const onRefresh = useCallback(() => {
    setAtualizando(true);
    carregar();
  }, [carregar]);

  const esp = proxima?.especialidade
    ? ESPECIALIDADE_LABEL[proxima.especialidade] ?? proxima.especialidade
    : null;
  const tipo = proxima ? TIPO_CONSULTA_LABEL[proxima.tipoConsulta] ?? proxima.tipoConsulta : null;

  const atalhos: { icone: keyof typeof Ionicons.glyphMap; rotulo: string; rota: Href; badge?: number }[] = [
    { icone: 'add-circle', rotulo: 'Agendar', rota: '/(app)/agendar' },
    { icone: 'calendar', rotulo: 'Minhas consultas', rota: '/(app)/consultas' },
    { icone: 'notifications', rotulo: 'Avisos', rota: '/(app)/notificacoes', badge: naoLidas },
    { icone: 'person', rotulo: 'Perfil', rota: '/(app)/perfil' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={ROXO} />}
      >
        {/* Saudação */}
        <View style={styles.header}>
          <Text style={styles.saudacao}>{saudacaoPorHora()},</Text>
          <Text style={styles.nome} numberOfLines={1}>
            {primeiroNome} 👋
          </Text>
        </View>

        {/* Próxima consulta */}
        <Text style={styles.secaoTitulo}>Próxima consulta</Text>
        {carregando ? (
          <View style={[styles.cardDestaque, styles.cardCarregando]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : proxima ? (
          <Pressable
            onPress={() => router.navigate('/(app)/consultas')}
            style={({ pressed }) => [styles.cardDestaque, pressed && styles.pressionado]}
          >
            <View style={styles.destaqueTopo}>
              <View style={styles.destaqueIcone}>
                <Ionicons name="calendar" size={18} color="#fff" />
              </View>
              <Text style={styles.destaqueEtiqueta}>AGENDADA</Text>
            </View>
            <Text style={styles.destaqueProfissional} numberOfLines={1}>
              {proxima.nomeProfissional}
            </Text>
            <Text style={styles.destaqueTipo} numberOfLines={1}>
              {tipo}
              {esp ? ` · ${esp}` : ''}
            </Text>
            <View style={styles.destaqueRodape}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.destaqueData}>{formatarDataHora(proxima.dataHoraConsulta)}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.cardVazio}>
            <Ionicons name="calendar-outline" size={32} color="#C4B5FD" />
            <Text style={styles.vazioTexto}>Você não tem consultas agendadas.</Text>
            <Pressable
              onPress={() => router.navigate('/(app)/agendar')}
              style={({ pressed }) => [styles.vazioBotao, pressed && styles.pressionado]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.vazioBotaoTexto}>Agendar consulta</Text>
            </Pressable>
          </View>
        )}

        {/* Atalhos */}
        <Text style={styles.secaoTitulo}>Atalhos</Text>
        <View style={styles.grade}>
          {atalhos.map((a) => (
            <Pressable
              key={String(a.rota)}
              onPress={() => router.navigate(a.rota)}
              style={({ pressed }) => [styles.atalho, pressed && styles.pressionado]}
            >
              <View style={styles.atalhoIcone}>
                <Ionicons name={a.icone} size={22} color={ROXO} />
                {!!a.badge && a.badge > 0 && (
                  <View style={styles.atalhoBadge}>
                    <Text style={styles.atalhoBadgeTexto}>{a.badge > 9 ? '9+' : a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.atalhoRotulo}>{a.rotulo}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  conteudo: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  header: { paddingBottom: 8 },
  saudacao: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  nome: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  secaoTitulo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },

  cardDestaque: {
    backgroundColor: ROXO,
    borderRadius: 24,
    padding: 20,
    gap: 6,
    shadowColor: ROXO,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardCarregando: { alignItems: 'center', justifyContent: 'center', minHeight: 132 },
  destaqueTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  destaqueIcone: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaqueEtiqueta: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  destaqueProfissional: { fontSize: 20, fontWeight: '800', color: '#fff' },
  destaqueTipo: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  destaqueRodape: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  destaqueData: { fontSize: 14, fontWeight: '700', color: '#fff' },

  cardVazio: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FaF5FF',
  },
  vazioTexto: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  vazioBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ROXO,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  vazioBotaoTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  atalho: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  atalhoIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atalhoBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atalhoBadgeTexto: { color: '#fff', fontSize: 10, fontWeight: '800' },
  atalhoRotulo: { fontSize: 14, fontWeight: '700', color: '#374151' },

  pressionado: { opacity: 0.85 },
});
