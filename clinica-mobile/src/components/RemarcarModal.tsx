import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TIPO_CONSULTA_LABEL } from '@/constants/agendamento';
import { remarcarConsulta } from '@/lib/agendamentos';
import { tipoConsultaParaInt } from '@/lib/consultas';
import { horariosDisponiveis } from '@/lib/consultas';
import { parseData, proximosDiasUteis, type DiaUtil } from '@/lib/datas';
import type { Agendamento } from '@/types/agendamento';

const ROXO = '#7C3AED';

interface Props {
  agendamento: Agendamento | null; // null = fechado
  onClose: () => void;
  onSuccess: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function RemarcarModal({ agendamento, onClose, onSuccess }: Props) {
  const dias = useMemo(() => proximosDiasUteis(10), []);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horarioSel, setHorarioSel] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Zera o estado sempre que abre para uma nova consulta.
  useEffect(() => {
    setDiaSel(null);
    setHorarios([]);
    setHorarioSel(null);
    setObservacao('');
  }, [agendamento?.id]);

  if (!agendamento) return null;

  const tipoInt = tipoConsultaParaInt(agendamento.tipoConsulta);
  const tipoLabel = TIPO_CONSULTA_LABEL[agendamento.tipoConsulta] ?? agendamento.tipoConsulta;

  async function selecionarDia(dia: DiaUtil) {
    setDiaSel(dia.iso);
    setHorarioSel(null);
    setCarregandoHorarios(true);
    try {
      setHorarios(await horariosDisponiveis(dia.iso, tipoInt));
    } catch {
      setHorarios([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }

  async function confirmar() {
    if (!agendamento || !diaSel || !horarioSel || salvando) return;
    if (!observacao.trim()) {
      Alert.alert('Observação obrigatória', 'Descreva o motivo da remarcação (fica registrado para auditoria).');
      return;
    }
    const novaDataHora = `${diaSel}T${horarioSel}:00`;

    const orig = parseData(agendamento.dataHoraConsulta);
    const origStr = orig
      ? `${orig.getFullYear()}-${pad(orig.getMonth() + 1)}-${pad(orig.getDate())}T${pad(orig.getHours())}:${pad(orig.getMinutes())}:00`
      : '';
    if (origStr === novaDataHora) {
      Alert.alert('Sem alteração', 'A nova data e hora devem ser diferentes do agendamento atual.');
      return;
    }

    setSalvando(true);
    try {
      await remarcarConsulta(agendamento.id, novaDataHora, observacao.trim());
      onSuccess();
    } catch (e) {
      Alert.alert('Não foi possível remarcar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const podeConfirmar = !!diaSel && !!horarioSel && !!observacao.trim() && !salvando;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fundo} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Reagendar consulta</Text>
          <Text style={styles.profissional}>{agendamento.nomeProfissional}</Text>
          <View style={styles.chipTipo}>
            <Text style={styles.chipTipoTexto}>{tipoLabel}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.corpo} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nova data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diasRow}>
            {dias.map((d) => {
              const ativo = diaSel === d.iso;
              return (
                <Pressable key={d.iso} onPress={() => selecionarDia(d)} style={[styles.dia, ativo && styles.diaAtivo]}>
                  <Text style={[styles.diaSemana, ativo && styles.textoAtivo]}>{d.diaSemana}</Text>
                  <Text style={[styles.diaNum, ativo && styles.textoAtivo]}>{d.dia}</Text>
                  <Text style={[styles.diaMes, ativo && styles.textoAtivo]}>{d.mes}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {diaSel && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Horário</Text>
              {carregandoHorarios ? (
                <ActivityIndicator color={ROXO} style={{ marginVertical: 12 }} />
              ) : horarios.length === 0 ? (
                <Text style={styles.semHorario}>Nenhum horário disponível para esta data.</Text>
              ) : (
                <View style={styles.horariosWrap}>
                  {horarios.map((h) => {
                    const ativo = horarioSel === h;
                    return (
                      <Pressable key={h} onPress={() => setHorarioSel(h)} style={[styles.hora, ativo && styles.horaAtiva]}>
                        <Text style={[styles.horaTexto, ativo && styles.textoAtivo]}>{h}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>Motivo (obrigatório)</Text>
              <TextInput
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Descreva o motivo da remarcação..."
                placeholderTextColor="#9CA3AF"
                multiline
                style={styles.textarea}
                editable={!salvando}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.rodape}>
          <Pressable onPress={onClose} disabled={salvando} style={styles.botaoSec}>
            <Text style={styles.botaoSecTexto}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={confirmar}
            disabled={!podeConfirmar}
            style={({ pressed }) => [styles.botao, !podeConfirmar && styles.botaoOff, pressed && podeConfirmar && { opacity: 0.85 }]}
          >
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Confirmar</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  eyebrow: { fontSize: 11, fontWeight: '800', color: ROXO, textTransform: 'uppercase', letterSpacing: 1 },
  profissional: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 2 },
  chipTipo: { alignSelf: 'flex-start', backgroundColor: '#F3E8FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  chipTipoTexto: { fontSize: 11, fontWeight: '800', color: '#6D28D9' },
  corpo: { paddingHorizontal: 24, paddingVertical: 16 },
  label: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  diasRow: { gap: 8, paddingVertical: 2 },
  dia: { width: 58, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', gap: 2 },
  diaAtivo: { backgroundColor: ROXO },
  diaSemana: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  diaNum: { fontSize: 17, fontWeight: '800', color: '#111827' },
  diaMes: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  textoAtivo: { color: '#fff' },
  semHorario: { fontSize: 14, color: '#9CA3AF', paddingVertical: 8 },
  horariosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  horaAtiva: { backgroundColor: ROXO },
  horaTexto: { fontSize: 14, fontWeight: '700', color: '#374151' },
  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    minHeight: 80,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },
  rodape: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 12 },
  botaoSec: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F3F4F6' },
  botaoSecTexto: { color: '#6B7280', fontWeight: '800', fontSize: 14 },
  botao: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: ROXO },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
