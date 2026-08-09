import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { useAuth } from '@/auth/AuthContext';
import { ESPECIALIDADE_LABEL, TIPO_CONSULTA_LABEL } from '@/constants/agendamento';
import {
  criarAgendamento,
  horariosDisponiveis,
  listarEspecialidades,
  MARCADOR_INJECAO,
  sugerirTipo,
  tipoConsultaParaInt,
  tipoProfissionalParaInt,
  type Especialidade,
  type SugestaoIA,
} from '@/lib/consultas';
import { proximosDiasUteis, type DiaUtil } from '@/lib/datas';

const ROXO = '#7C3AED';
const MIN_SINTOMAS = 10;
const MAX_SINTOMAS = 300;

export default function AgendarScreen() {
  const { session, logout } = useAuth();
  const router = useRouter();

  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [sintomas, setSintomas] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoIA | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);

  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horarioSel, setHorarioSel] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(() => proximosDiasUteis(10), []);

  useEffect(() => {
    listarEspecialidades().then(setEspecialidades).catch(() => {});
  }, []);

  const tipoConsultaInt = sugestao ? tipoConsultaParaInt(sugestao.tipoConsulta) : 3;
  const especialidadeId = useMemo(() => {
    if (!sugestao) return null;
    const e = especialidades.find((x) => x.nome.toLowerCase() === sugestao.especialidade.toLowerCase());
    return e ? e.id : null;
  }, [sugestao, especialidades]);

  const sintomasValido = sintomas.trim().length >= MIN_SINTOMAS && sintomas.trim().length <= MAX_SINTOMAS;

  async function analisar() {
    if (!sintomasValido || analisando) return;
    setAnalisando(true);
    try {
      const s = await sugerirTipo(sintomas.trim());
      if (s.justificativa?.includes(MARCADOR_INJECAO)) {
        Alert.alert('Acesso bloqueado', s.justificativa, [{ text: 'Entendi', onPress: () => logout() }]);
        return;
      }
      setSugestao(s);
      setPasso(2);
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Falha ao analisar os sintomas.');
    } finally {
      setAnalisando(false);
    }
  }

  async function selecionarDia(dia: DiaUtil) {
    setDiaSel(dia.iso);
    setHorarioSel(null);
    setCarregandoHorarios(true);
    try {
      setHorarios(await horariosDisponiveis(dia.iso, tipoConsultaInt, especialidadeId ?? undefined));
    } catch {
      setHorarios([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }

  async function confirmar() {
    if (!session?.pacienteId || !diaSel || !horarioSel || salvando) return;
    setSalvando(true);
    try {
      await criarAgendamento({
        pacienteId: session.pacienteId,
        dataHoraConsulta: `${diaSel}T${horarioSel}:00`,
        tipoProfissional: sugestao ? tipoProfissionalParaInt(sugestao.tipoProfissional) : 1,
        tipoConsulta: tipoConsultaInt,
        especialidadeId: tipoConsultaInt === 3 ? especialidadeId : null,
        observacao: sintomas.trim(),
      });
      Alert.alert('Pronto!', 'Sua consulta foi agendada.', [{ text: 'Ver minhas consultas', onPress: irParaConsultas }]);
    } catch (e) {
      Alert.alert('Não foi possível agendar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function irParaConsultas() {
    reiniciar();
    router.navigate('/(app)');
  }

  function reiniciar() {
    setPasso(1);
    setSintomas('');
    setSugestao(null);
    setDiaSel(null);
    setHorarios([]);
    setHorarioSel(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Agendar consulta</Text>
        <Text style={styles.passoTexto}>Passo {passo} de 3</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {passo === 1 && (
            <View style={styles.bloco}>
              <Text style={styles.label}>Descreva seus sintomas</Text>
              <Text style={styles.ajuda}>
                Conte o que você está sentindo. Nossa IA vai sugerir a especialidade e o tipo de atendimento.
              </Text>
              <TextInput
                value={sintomas}
                onChangeText={setSintomas}
                placeholder="Ex.: dor de cabeça há 3 dias, com febre e enjoo..."
                placeholderTextColor="#9CA3AF"
                multiline
                style={styles.textarea}
                maxLength={MAX_SINTOMAS}
                editable={!analisando}
              />
              <Text style={styles.contador}>
                {sintomas.trim().length}/{MAX_SINTOMAS}
                {sintomas.trim().length > 0 && sintomas.trim().length < MIN_SINTOMAS
                  ? ` · mínimo ${MIN_SINTOMAS}`
                  : ''}
              </Text>

              <Pressable
                onPress={analisar}
                disabled={!sintomasValido || analisando}
                style={({ pressed }) => [
                  styles.botao,
                  (!sintomasValido || analisando) && styles.botaoOff,
                  pressed && sintomasValido && { opacity: 0.85 },
                ]}
              >
                {analisando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botaoTexto}>Analisar sintomas</Text>
                )}
              </Pressable>
            </View>
          )}

          {passo === 2 && sugestao && (
            <View style={styles.bloco}>
              <Text style={styles.label}>Sugestão da IA</Text>
              <View style={styles.cardSugestao}>
                <Linha rotulo="Especialidade" valor={ESPECIALIDADE_LABEL[sugestao.especialidade] ?? sugestao.especialidade} />
                <Linha rotulo="Atendimento" valor={TIPO_CONSULTA_LABEL[sugestao.tipoConsulta] ?? sugestao.tipoConsulta} />
                <Linha rotulo="Profissional" valor={sugestao.tipoProfissional} />
                {!!sugestao.justificativa && (
                  <View style={styles.justificativa}>
                    <Text style={styles.justificativaTexto}>{sugestao.justificativa}</Text>
                  </View>
                )}
              </View>

              <Pressable onPress={() => setPasso(3)} style={({ pressed }) => [styles.botao, pressed && { opacity: 0.85 }]}>
                <Text style={styles.botaoTexto}>Continuar</Text>
              </Pressable>
              <Pressable onPress={() => setPasso(1)} style={styles.botaoSec}>
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}

          {passo === 3 && (
            <View style={styles.bloco}>
              <Text style={styles.label}>Escolha o dia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diasRow}>
                {dias.map((d) => {
                  const ativo = diaSel === d.iso;
                  return (
                    <Pressable key={d.iso} onPress={() => selecionarDia(d)} style={[styles.dia, ativo && styles.diaAtivo]}>
                      <Text style={[styles.diaSemana, ativo && styles.diaTextoAtivo]}>{d.diaSemana}</Text>
                      <Text style={[styles.diaNum, ativo && styles.diaTextoAtivo]}>{d.dia}</Text>
                      <Text style={[styles.diaMes, ativo && styles.diaTextoAtivo]}>{d.mes}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {diaSel && (
                <>
                  <Text style={[styles.label, { marginTop: 8 }]}>Horários disponíveis</Text>
                  {carregandoHorarios ? (
                    <ActivityIndicator color={ROXO} style={{ marginVertical: 16 }} />
                  ) : horarios.length === 0 ? (
                    <Text style={styles.semHorario}>Nenhum horário disponível neste dia.</Text>
                  ) : (
                    <View style={styles.horariosWrap}>
                      {horarios.map((h) => {
                        const ativo = horarioSel === h;
                        return (
                          <Pressable key={h} onPress={() => setHorarioSel(h)} style={[styles.hora, ativo && styles.horaAtiva]}>
                            <Text style={[styles.horaTexto, ativo && styles.diaTextoAtivo]}>{h}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              <Pressable
                onPress={confirmar}
                disabled={!horarioSel || salvando}
                style={({ pressed }) => [
                  styles.botao,
                  (!horarioSel || salvando) && styles.botaoOff,
                  pressed && horarioSel && { opacity: 0.85 },
                ]}
              >
                {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Confirmar agendamento</Text>}
              </Pressable>
              <Pressable onPress={() => setPasso(2)} style={styles.botaoSec}>
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  passoTexto: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginTop: 2 },
  conteudo: { padding: 24, gap: 16 },
  bloco: { gap: 12 },
  label: { fontSize: 13, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  ajuda: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },
  contador: { fontSize: 12, color: '#9CA3AF', textAlign: 'right' },
  botao: { backgroundColor: ROXO, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  botaoSec: { paddingVertical: 12, alignItems: 'center' },
  botaoSecTexto: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
  cardSugestao: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 20, padding: 16, gap: 10 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaRotulo: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  linhaValor: { fontSize: 15, fontWeight: '800', color: '#111827' },
  justificativa: { backgroundColor: '#F3E8FF', borderRadius: 12, padding: 12, marginTop: 4 },
  justificativaTexto: { fontSize: 13, color: '#6D28D9', lineHeight: 19 },
  diasRow: { gap: 8, paddingVertical: 4 },
  dia: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    gap: 2,
  },
  diaAtivo: { backgroundColor: ROXO },
  diaSemana: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  diaNum: { fontSize: 18, fontWeight: '800', color: '#111827' },
  diaMes: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  diaTextoAtivo: { color: '#fff' },
  semHorario: { fontSize: 14, color: '#9CA3AF', paddingVertical: 12 },
  horariosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  horaAtiva: { backgroundColor: ROXO },
  horaTexto: { fontSize: 14, fontWeight: '700', color: '#374151' },
});
