import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { STATUS_CANCELAVEIS } from '@/constants/agendamento';
import { formatarDataHora } from '@/lib/datas';
import type { Agendamento } from '@/types/agendamento';

interface Props {
  agendamento: Agendamento | null; // null = fechado
  onClose: () => void;
  onRemarcar: (a: Agendamento) => void;
  onCancelar: (a: Agendamento) => void;
}

type Acao = {
  chave: string;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  onPress: () => void;
};

// Menu de ações da consulta (bottom-sheet do 3-pontinhos). Estruturado como uma
// lista de ações para facilitar adicionar novas no futuro (ex.: ver histórico,
// detalhes, resultado de exame) — hoje presentes só no web.
export default function AcoesConsultaModal({ agendamento, onClose, onRemarcar, onCancelar }: Props) {
  if (!agendamento) return null;

  const cancelavel = STATUS_CANCELAVEIS.includes(agendamento.status);

  const acoes: Acao[] = [];
  if (cancelavel) {
    acoes.push({
      chave: 'remarcar',
      rotulo: 'Remarcar',
      icone: 'calendar-outline',
      cor: '#6D28D9',
      onPress: () => onRemarcar(agendamento),
    });
    acoes.push({
      chave: 'cancelar',
      rotulo: 'Cancelar consulta',
      icone: 'close-circle-outline',
      cor: '#B91C1C',
      onPress: () => onCancelar(agendamento),
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fundo} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.titulo}>{agendamento.nomeProfissional}</Text>
          <Text style={styles.sub}>{formatarDataHora(agendamento.dataHoraConsulta)}</Text>
        </View>

        <View style={styles.lista}>
          {acoes.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma ação disponível para esta consulta.</Text>
          ) : (
            acoes.map((a) => (
              <Pressable
                key={a.chave}
                onPress={a.onPress}
                style={({ pressed }) => [styles.acao, pressed && styles.acaoPressionada]}
              >
                <Ionicons name={a.icone} size={22} color={a.cor} />
                <Text style={[styles.acaoTexto, { color: a.cor }]}>{a.rotulo}</Text>
              </Pressable>
            ))
          )}
        </View>

        <Pressable onPress={onClose} style={styles.fechar}>
          <Text style={styles.fecharTexto}>Fechar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 24 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
  lista: { paddingHorizontal: 12, paddingTop: 8 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14 },
  acaoPressionada: { backgroundColor: '#F9FAFB' },
  acaoTexto: { fontSize: 16, fontWeight: '700' },
  vazio: { fontSize: 14, color: '#9CA3AF', padding: 16, textAlign: 'center' },
  fechar: { marginTop: 8, marginHorizontal: 24, paddingVertical: 14, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' },
  fecharTexto: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
});
