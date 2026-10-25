import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { ESPECIALIDADE_LABEL, TIPO_CONSULTA_LABEL } from '@/constants/agendamento';
import { listarMinhasConsultas } from '@/lib/agendamentos';
import {
  criarAgendamento,
  diasDisponiveis,
  especialidadesDisponiveis,
  horariosDisponiveis,
  listarEspecialidades,
  MARCADOR_INJECAO,
  sugerirTipo,
  tipoConsultaParaInt,
  tipoProfissionalParaInt,
  type Especialidade,
  type SugestaoIA,
} from '@/lib/consultas';
import CalendarioMes from '@/components/CalendarioMes';
import { formatarDataHora } from '@/lib/datas';
import type { Agendamento } from '@/types/agendamento';

const AZUL = '#2C5282';
const MIN_SINTOMAS = 10;
const MAX_SINTOMAS = 300;

type Modo = 'escolha' | 'ia' | 'manual';

// Tipos de consulta que o paciente pode escolher no modo manual.
// Retorno (4) exige selecionar uma consulta anterior aguardando retorno (origem).
const TIPOS_MANUAIS: { valor: number; label: string }[] = [
  { valor: 3, label: 'Consulta Médica' },
  { valor: 0, label: 'Triagem' },
  { valor: 1, label: 'Exame' },
  { valor: 2, label: 'Vacina' },
  { valor: 4, label: 'Retorno' },
];

export default function AgendarScreen() {
  const { session, logout } = useAuth();
  const router = useRouter();

  const [modo, setModo] = useState<Modo>('escolha');

  // Fluxo IA
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [sintomas, setSintomas] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoIA | null>(null);

  // Fluxo manual
  const [manualPasso, setManualPasso] = useState<1 | 2>(1);
  const [tipoConsultaManual, setTipoConsultaManual] = useState<number>(3);
  const [especialidadeManual, setEspecialidadeManual] = useState<string>('');
  const [tipoSelectAberto, setTipoSelectAberto] = useState(false);
  const [espSelectAberto, setEspSelectAberto] = useState(false);

  // Retorno (tipo 4): escolha da consulta de origem (status AguardandoRetorno).
  const [retornos, setRetornos] = useState<Agendamento[]>([]);
  const [origemSel, setOrigemSel] = useState<string | null>(null);

  // Acolhimento em crise emocional (IA) + confirmação de sucesso com o profissional.
  const [crise, setCrise] = useState<{ mensagem: string; sugestao: SugestaoIA } | null>(null);
  const [sucesso, setSucesso] = useState<{ nome: string; foto: string | null } | null>(null);

  // Compartilhado
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [dispIds, setDispIds] = useState<number[]>([]);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horarioSel, setHorarioSel] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Calendário: mês visível (atual até +2) e dias com horário livre nele.
  const hoje = new Date();
  const [mesCal, setMesCal] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [diasLivres, setDiasLivres] = useState<string[]>([]);
  const [carregandoDias, setCarregandoDias] = useState(false);
  const indiceMes = (m: { ano: number; mes: number }) => m.ano * 12 + m.mes;
  const indiceHoje = hoje.getFullYear() * 12 + hoje.getMonth();

  useEffect(() => {
    listarEspecialidades().then(setEspecialidades).catch(() => {});
    especialidadesDisponiveis().then(setDispIds).catch(() => {});
    listarMinhasConsultas()
      .then((cs) => setRetornos(cs.filter((c) => c.status === 'AguardandoRetorno')))
      .catch(() => {});
  }, []);

  const tipoManualLabel = TIPOS_MANUAIS.find((t) => t.valor === tipoConsultaManual)?.label ?? 'Selecione';

  const ehManual = modo === 'manual';

  // Valores efetivos (o passo de dia/horário e a confirmação servem aos dois fluxos).
  const tipoConsultaInt = ehManual
    ? tipoConsultaManual
    : sugestao
      ? tipoConsultaParaInt(sugestao.tipoConsulta)
      : 3;

  const especialidadeId = useMemo(() => {
    const nome = ehManual ? especialidadeManual : sugestao?.especialidade;
    if (!nome) return null;
    const e = especialidades.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
    return e ? e.id : null;
  }, [ehManual, especialidadeManual, sugestao, especialidades]);

  const tipoProfissionalInt = ehManual
    ? tipoConsultaManual >= 3
      ? 1
      : 0 // Consulta Médica/Retorno = Médico; Triagem/Exame/Vacina = Enfermeira
    : sugestao
      ? tipoProfissionalParaInt(sugestao.tipoProfissional)
      : 1;

  const noPassoDia = (modo === 'ia' && passo === 3) || (modo === 'manual' && manualPasso === 2);

  // Recarrega os dias livres ao entrar no passo de dia, trocar de mês ou mudar tipo/especialidade/origem.
  useEffect(() => {
    if (!noPassoDia) return;
    let ativo = true;
    setCarregandoDias(true);
    diasDisponiveis(mesCal.ano, mesCal.mes + 1, tipoConsultaInt, especialidadeId ?? undefined, origemSel ?? undefined)
      .catch(() => [] as string[])
      .then((dias) => {
        if (ativo) setDiasLivres(dias);
      })
      .finally(() => {
        if (ativo) setCarregandoDias(false);
      });
    return () => {
      ativo = false;
    };
  }, [noPassoDia, mesCal, tipoConsultaInt, especialidadeId, origemSel]);

  function mudarMes(delta: 1 | -1) {
    limparHorarios();
    setMesCal((m) => {
      const d = new Date(m.ano, m.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  const sintomasValido = sintomas.trim().length >= MIN_SINTOMAS && sintomas.trim().length <= MAX_SINTOMAS;
  const detalhesManualValido =
    tipoConsultaManual === 3
      ? !!especialidadeManual
      : tipoConsultaManual === 4
        ? !!origemSel
        : true;

  async function analisar() {
    if (!sintomasValido || analisando) return;
    setAnalisando(true);
    try {
      const s = await sugerirTipo(sintomas.trim());
      if (s.justificativa?.includes(MARCADOR_INJECAO)) {
        // Banido no servidor: apaga tudo (sem re-login biométrico — o JWT ainda vale ~3h).
        Alert.alert('Acesso bloqueado', s.justificativa, [{ text: 'Entendi', onPress: () => logout(true) }]);
        return;
      }
      // Crise emocional: acolhe (CVV 188) e pergunta se deseja agendar Psiquiatria — nunca pune.
      if (s.crise) {
        setCrise({ mensagem: s.mensagem ?? '', sugestao: s });
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

  function limparHorarios() {
    setDiaSel(null);
    setHorarios([]);
    setHorarioSel(null);
  }

  async function selecionarDia(dia: string) {
    setDiaSel(dia);
    setHorarioSel(null);
    setCarregandoHorarios(true);
    try {
      setHorarios(
        await horariosDisponiveis(dia, tipoConsultaInt, especialidadeId ?? undefined, origemSel ?? undefined),
      );
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
      const criado = await criarAgendamento({
        pacienteId: session.pacienteId,
        dataHoraConsulta: `${diaSel}T${horarioSel}:00`,
        tipoProfissional: tipoProfissionalInt,
        tipoConsulta: tipoConsultaInt,
        especialidadeId: tipoConsultaInt === 3 ? especialidadeId : null,
        observacao: ehManual ? '' : sintomas.trim(),
        agendamentoOrigemId: tipoConsultaInt === 4 ? origemSel : null,
      });
      // Tela de sucesso (sem auto-sumiço): mostra o profissional delegado (nome + foto).
      setSucesso({ nome: criado.nomeProfissional, foto: criado.profissionalFotoBase64 });
    } catch (e) {
      Alert.alert('Não foi possível agendar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function irParaConsultas() {
    setSucesso(null);
    reiniciar();
    router.navigate('/(app)/consultas');
  }

  function reiniciar() {
    setModo('escolha');
    setPasso(1);
    setSintomas('');
    setSugestao(null);
    setManualPasso(1);
    setTipoConsultaManual(3);
    setEspecialidadeManual('');
    setOrigemSel(null);
    limparHorarios();
  }

  const subtitulo =
    modo === 'escolha'
      ? 'Como você prefere agendar?'
      : modo === 'ia'
        ? `Passo ${passo} de 3`
        : `Passo ${manualPasso} de 2`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Agendar consulta</Text>
        <Text style={styles.passoTexto}>{subtitulo}</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {/* ─── Escolha do modo ─── */}
          {modo === 'escolha' && (
            <View style={styles.bloco}>
              <Pressable
                onPress={() => {
                  setModo('ia');
                  setPasso(1);
                }}
                style={({ pressed }) => [styles.opcaoIA, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.opcaoIcone}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <View style={styles.opcaoTituloRow}>
                    <Text style={styles.opcaoIATitulo}>Ajuda com IA</Text>
                    <View style={styles.badgeRecomendado}>
                      <Text style={styles.badgeRecomendadoTexto}>Recomendado</Text>
                    </View>
                  </View>
                  <Text style={styles.opcaoIASub}>Descreva os sintomas e a IA sugere a especialidade.</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setModo('manual');
                  setManualPasso(1);
                }}
                style={({ pressed }) => [styles.opcaoManual, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.opcaoIconeManual}>
                  <Ionicons name="options-outline" size={22} color={AZUL} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.opcaoManualTitulo}>Escolher manualmente</Text>
                  <Text style={styles.opcaoManualSub}>Selecione o tipo, a especialidade e o horário. (Avançado)</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* ─── Fluxo IA ─── */}
          {modo === 'ia' && passo === 1 && (
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
              <Pressable onPress={reiniciar} style={styles.botaoSec}>
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}

          {modo === 'ia' && passo === 2 && sugestao && (
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

              <Pressable
                onPress={() => {
                  limparHorarios();
                  setPasso(3);
                }}
                style={({ pressed }) => [styles.botao, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.botaoTexto}>Continuar</Text>
              </Pressable>
              <Pressable onPress={() => setPasso(1)} style={styles.botaoSec}>
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}

          {/* ─── Fluxo manual: passo 1 (tipo + especialidade) ─── */}
          {modo === 'manual' && manualPasso === 1 && (
            <View style={styles.bloco}>
              <Text style={styles.label}>Tipo de atendimento</Text>
              <Pressable onPress={() => setTipoSelectAberto(true)} style={styles.select}>
                <Text style={styles.selectTexto}>{tipoManualLabel}</Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </Pressable>

              {tipoConsultaManual === 3 && (
                <>
                  <Text style={[styles.label, { marginTop: 8 }]}>Especialidade</Text>
                  {especialidades.length === 0 ? (
                    <ActivityIndicator color={AZUL} style={{ marginVertical: 12 }} />
                  ) : (
                    <Pressable onPress={() => setEspSelectAberto(true)} style={styles.select}>
                      <Text style={[styles.selectTexto, !especialidadeManual && styles.selectPlaceholder]}>
                        {especialidadeManual
                          ? ESPECIALIDADE_LABEL[especialidadeManual] ?? especialidadeManual
                          : 'Selecione a especialidade'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#6B7280" />
                    </Pressable>
                  )}
                </>
              )}

              {tipoConsultaManual === 4 && (
                <>
                  <Text style={[styles.label, { marginTop: 8 }]}>Consulta de origem</Text>
                  {retornos.length === 0 ? (
                    <Text style={styles.legenda}>
                      Você não tem consultas aguardando retorno. O retorno é liberado pela equipe ao finalizar um
                      atendimento.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {retornos.map((r) => {
                        const ativo = origemSel === r.id;
                        return (
                          <Pressable
                            key={r.id}
                            onPress={() => {
                              setOrigemSel(r.id);
                              limparHorarios();
                            }}
                            style={[styles.origemCard, ativo && styles.origemCardAtivo]}
                          >
                            <View style={styles.flex}>
                              <Text style={[styles.origemNome, ativo && styles.origemTextoAtivo]}>
                                {r.nomeProfissional}
                              </Text>
                              <Text style={[styles.origemSub, ativo && styles.origemSubAtivo]}>
                                {(TIPO_CONSULTA_LABEL[r.tipoConsulta] ?? r.tipoConsulta)} ·{' '}
                                {formatarDataHora(r.dataHoraConsulta)}
                              </Text>
                            </View>
                            {ativo && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              <Pressable
                onPress={() => setManualPasso(2)}
                disabled={!detalhesManualValido}
                style={({ pressed }) => [
                  styles.botao,
                  !detalhesManualValido && styles.botaoOff,
                  pressed && detalhesManualValido && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.botaoTexto}>Continuar</Text>
              </Pressable>
              <Pressable onPress={reiniciar} style={styles.botaoSec}>
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}

          {/* ─── Passo de dia/horário (IA passo 3 e manual passo 2) ─── */}
          {noPassoDia && (
            <View style={styles.bloco}>
              <Text style={styles.label}>Escolha o dia</Text>
              <CalendarioMes
                ano={mesCal.ano}
                mes={mesCal.mes}
                disponiveis={diasLivres}
                selecionado={diaSel}
                carregando={carregandoDias}
                podeVoltar={indiceMes(mesCal) > indiceHoje}
                podeAvancar={indiceMes(mesCal) < indiceHoje + 2}
                onSelecionar={selecionarDia}
                onMudarMes={mudarMes}
              />

              {diaSel && (
                <>
                  <Text style={[styles.label, { marginTop: 8 }]}>Horários disponíveis</Text>
                  {carregandoHorarios ? (
                    <ActivityIndicator color={AZUL} style={{ marginVertical: 16 }} />
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
              <Pressable
                onPress={() => (modo === 'manual' ? setManualPasso(1) : setPasso(2))}
                style={styles.botaoSec}
              >
                <Text style={styles.botaoSecTexto}>Voltar</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Select de especialidade (bottom-sheet). Disponíveis primeiro; sem agenda ficam no fim, desabilitadas. */}
      <Modal visible={espSelectAberto} transparent animationType="fade" onRequestClose={() => setEspSelectAberto(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setEspSelectAberto(false)}>
          <Pressable style={[styles.selectSheet, styles.selectSheetAlto]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.selectSheetTitulo}>Especialidade</Text>
            <ScrollView>
              {[...especialidades]
                .sort((a, b) => Number(dispIds.includes(b.id)) - Number(dispIds.includes(a.id)))
                .map((e) => {
                  const ativo = especialidadeManual === e.nome;
                  const disponivel = dispIds.includes(e.id);
                  return (
                    <Pressable
                      key={e.id}
                      disabled={!disponivel}
                      onPress={() => {
                        setEspecialidadeManual(e.nome);
                        limparHorarios();
                        setEspSelectAberto(false);
                      }}
                      style={styles.selectOpcao}
                    >
                      <Text
                        style={[
                          styles.selectOpcaoTexto,
                          ativo && styles.selectOpcaoTextoAtivo,
                          !disponivel && styles.selectOpcaoTextoOff,
                        ]}
                      >
                        {ESPECIALIDADE_LABEL[e.nome] ?? e.nome}
                      </Text>
                      {ativo ? (
                        <Ionicons name="checkmark" size={20} color={AZUL} />
                      ) : (
                        !disponivel && <Text style={styles.selectOpcaoTag}>Sem agenda</Text>
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Select de tipo de atendimento (bottom-sheet) */}
      <Modal visible={tipoSelectAberto} transparent animationType="fade" onRequestClose={() => setTipoSelectAberto(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setTipoSelectAberto(false)}>
          <Pressable style={styles.selectSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.selectSheetTitulo}>Tipo de atendimento</Text>
            {TIPOS_MANUAIS.map((t) => {
              const ativo = tipoConsultaManual === t.valor;
              return (
                <Pressable
                  key={t.valor}
                  onPress={() => {
                    setTipoConsultaManual(t.valor);
                    if (t.valor !== 3) setEspecialidadeManual('');
                    setOrigemSel(null);
                    limparHorarios();
                    setTipoSelectAberto(false);
                  }}
                  style={styles.selectOpcao}
                >
                  <Text style={[styles.selectOpcaoTexto, ativo && styles.selectOpcaoTextoAtivo]}>{t.label}</Text>
                  {ativo && <Ionicons name="checkmark" size={20} color={AZUL} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Acolhimento em crise emocional (CVV 188 + oferta de Psiquiatria) */}
      <Modal visible={!!crise} transparent animationType="fade" onRequestClose={() => setCrise(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.criseIcone}>
              <Ionicons name="heart" size={26} color="#fff" />
            </View>
            <Text style={styles.modalTitulo}>Você não está sozinho</Text>
            <Text style={styles.modalTexto}>{crise?.mensagem}</Text>

            <Pressable onPress={() => Linking.openURL('tel:188')} style={styles.botaoCvv}>
              <Ionicons name="call" size={18} color={AZUL} />
              <Text style={styles.botaoCvvTexto}>Ligar para o CVV — 188</Text>
            </Pressable>

            <Text style={styles.modalPergunta}>Deseja agendar uma consulta com Psiquiatria?</Text>
            <Pressable
              onPress={() => {
                if (!crise) return;
                const s = crise.sugestao;
                setCrise(null);
                setSugestao(s);
                limparHorarios();
                setModo('ia');
                setPasso(2);
              }}
              style={({ pressed }) => [styles.botao, styles.botaoStretch, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.botaoTexto}>Sim, agendar Psiquiatria</Text>
            </Pressable>
            <Pressable onPress={() => setCrise(null)} style={styles.botaoSec}>
              <Text style={styles.botaoSecTexto}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sucesso: confirma e mostra o profissional responsável (fica até o usuário escolher) */}
      <Modal visible={!!sucesso} transparent animationType="fade" onRequestClose={irParaConsultas}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sucessoIcone}>
              <Ionicons name="checkmark" size={30} color="#fff" />
            </View>
            <Text style={styles.modalTitulo}>Consulta agendada!</Text>
            <Text style={styles.modalTexto}>Tudo certo — sua consulta foi registrada.</Text>

            {!!sucesso?.nome && (
              <View style={styles.profCard}>
                {sucesso.foto ? (
                  <Image source={{ uri: sucesso.foto }} style={styles.profAvatarImg} contentFit="cover" />
                ) : (
                  <View style={styles.profAvatar}>
                    <Text style={styles.profAvatarTexto}>{sucesso.nome.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.profRotulo}>Profissional responsável</Text>
                  <Text style={styles.profNome} numberOfLines={1}>
                    {sucesso.nome}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              onPress={irParaConsultas}
              style={({ pressed }) => [styles.botao, styles.botaoStretch, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.botaoTexto}>Ver minhas consultas</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setSucesso(null);
                reiniciar();
              }}
              style={styles.botaoSec}
            >
              <Text style={styles.botaoSecTexto}>Novo agendamento</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  botao: { backgroundColor: AZUL, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  botaoSec: { paddingVertical: 12, alignItems: 'center' },
  botaoSecTexto: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
  // Cards de escolha do modo
  opcaoIA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: AZUL,
    borderRadius: 20,
    padding: 18,
  },
  opcaoIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcaoIATitulo: { fontSize: 17, fontWeight: '800', color: '#fff' },
  opcaoIASub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3, lineHeight: 18 },
  badgeRecomendado: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeRecomendadoTexto: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  opcaoManual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  opcaoIconeManual: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoManualTitulo: { fontSize: 16, fontWeight: '800', color: '#111827' },
  opcaoManualSub: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  // Select (tipo de atendimento)
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  selectTexto: { fontSize: 15, fontWeight: '700', color: '#111827' },
  selectBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  selectSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 4 },
  selectSheetTitulo: { fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selectOpcao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  selectOpcaoTexto: { fontSize: 16, fontWeight: '600', color: '#374151' },
  selectOpcaoTextoAtivo: { color: AZUL, fontWeight: '800' },
  selectOpcaoTextoOff: { color: '#D1D5DB' },
  selectOpcaoTag: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  selectPlaceholder: { color: '#9CA3AF', fontWeight: '600' },
  selectSheetAlto: { maxHeight: '75%' },
  legenda: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 4, lineHeight: 17 },
  cardSugestao: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 20, padding: 16, gap: 10 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaRotulo: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  linhaValor: { fontSize: 15, fontWeight: '800', color: '#111827' },
  justificativa: { backgroundColor: '#EEF2F7', borderRadius: 12, padding: 12, marginTop: 4 },
  justificativaTexto: { fontSize: 13, color: '#2C5282', lineHeight: 19 },
  diaTextoAtivo: { color: '#fff' },
  semHorario: { fontSize: 14, color: '#9CA3AF', paddingVertical: 12 },
  horariosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  horaAtiva: { backgroundColor: AZUL },
  horaTexto: { fontSize: 14, fontWeight: '700', color: '#374151' },
  // Consulta de origem (Retorno)
  origemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  origemCardAtivo: { backgroundColor: AZUL, borderColor: AZUL },
  origemNome: { fontSize: 15, fontWeight: '800', color: '#111827' },
  origemSub: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 2 },
  origemTextoAtivo: { color: '#fff' },
  origemSubAtivo: { color: 'rgba(255,255,255,0.85)' },
  // Modais centrais (crise / sucesso)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10 },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalTexto: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20 },
  modalPergunta: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 8 },
  botaoStretch: { alignSelf: 'stretch' },
  criseIcone: { width: 56, height: 56, borderRadius: 28, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sucessoIcone: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#047857', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  botaoCvv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: '#EEF2F7',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  botaoCvvTexto: { color: AZUL, fontSize: 15, fontWeight: '800' },
  // Card do profissional (tela de sucesso)
  profCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 12,
    marginTop: 6,
  },
  profAvatarImg: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#EEF2F7' },
  profAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center' },
  profAvatarTexto: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profRotulo: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  profNome: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
});
