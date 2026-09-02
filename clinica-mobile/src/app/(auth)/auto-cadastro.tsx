import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cores } from '@/constants/tema';
import { isEmailValido, isTelefoneValido, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/validadores';
import { obterDeclaracao, solicitarCadastro, type ModeloDeclaracao } from '@/lib/autoCadastro';

type RespostaState = { resposta: boolean | null; detalhe: string };

export default function AutoCadastroScreen() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [modelo, setModelo] = useState<ModeloDeclaracao | null>(null);
  const [falhaCarregar, setFalhaCarregar] = useState(false);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [temProblemaMemoria, setTemProblemaMemoria] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await obterDeclaracao();
        setModelo(m);
        if (m) {
          setRespostas(Object.fromEntries(m.perguntas.map((p) => [p.perguntaId, { resposta: null, detalhe: '' }])));
        }
      } catch {
        setFalhaCarregar(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const perguntasOrdenadas = useMemo(
    () => (modelo ? [...modelo.perguntas].sort((a, b) => a.ordem - b.ordem) : []),
    [modelo],
  );

  function setResposta(id: string, resposta: boolean) {
    setRespostas((prev) => ({ ...prev, [id]: { ...prev[id], resposta } }));
  }
  function setDetalhe(id: string, detalhe: string) {
    setRespostas((prev) => ({ ...prev, [id]: { ...prev[id], detalhe } }));
  }

  function validar(): string | null {
    if (!nome.trim()) return 'Informe o nome completo.';
    if (soDigitos(cpf).length !== 11) return 'Informe um CPF válido (11 dígitos).';
    if (!isEmailValido(email)) return 'Informe um e-mail válido.';
    if (telefone.trim() && !isTelefoneValido(telefone)) return 'Telefone inválido. Informe DDD + número.';
    for (const p of perguntasOrdenadas) {
      const r = respostas[p.perguntaId];
      if (!r || r.resposta === null) return 'Responda todas as perguntas da declaração de saúde.';
      if (r.resposta && !r.detalhe.trim()) return 'As respostas "Sim" exigem um detalhamento.';
    }
    return null;
  }

  async function enviar() {
    if (!modelo) return;
    const msg = validar();
    if (msg) { setErro(msg); return; }
    setErro(null);
    setEnviando(true);
    try {
      const mensagem = await solicitarCadastro({
        nome: nome.trim(),
        cpf: soDigitos(cpf),
        email: email.trim(),
        telefone: telefone.trim() ? soDigitos(telefone) : null,
        temProblemaMemoria,
        modeloId: modelo.modeloId,
        respostas: perguntasOrdenadas.map((p) => {
          const r = respostas[p.perguntaId];
          return { perguntaId: p.perguntaId, resposta: !!r.resposta, detalhe: r.resposta ? r.detalhe.trim() : null };
        }),
      });
      setSucesso(mensagem);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setEnviando(false);
    }
  }

  // ── Sucesso ──────────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.sucessoWrap}>
          <View style={styles.sucessoIcone}>
            <Ionicons name="checkmark-circle" size={64} color={cores.sucesso} />
          </View>
          <Text style={styles.sucessoTitulo}>Solicitação enviada!</Text>
          <Text style={styles.sucessoTexto}>{sucesso}</Text>
          <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.botao}>
            <Text style={styles.botaoTexto}>Voltar ao login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.voltarBtn}>
          <Ionicons name="chevron-back" size={24} color={cores.texto} />
        </Pressable>
        <Text style={styles.topoTitulo}>Criar cadastro</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {carregando ? (
            <View style={styles.centro}><ActivityIndicator color={cores.primaria} size="large" /></View>
          ) : falhaCarregar || !modelo ? (
            <View style={styles.avisoCard}>
              <Ionicons name="alert-circle-outline" size={28} color={cores.alerta} />
              <Text style={styles.avisoTexto}>
                O cadastro on-line está indisponível no momento. Procure a recepção da clínica para se cadastrar presencialmente.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.intro}>
                Preencha seus dados e a declaração de saúde. Depois de enviar, compareça à clínica para a{' '}
                <Text style={styles.introForte}>avaliação presencial</Text>. Você será avisado por e-mail sobre a decisão.
              </Text>

              {/* Dados pessoais */}
              <View style={styles.secao}>
                <Text style={styles.secaoTitulo}>Seus dados</Text>

                <Campo label="Nome completo">
                  <TextInput value={nome} onChangeText={setNome} placeholder="Nome completo" placeholderTextColor={cores.textoSuave}
                    style={styles.input} editable={!enviando} />
                </Campo>
                <Campo label="CPF">
                  <TextInput value={cpf} onChangeText={(v) => setCpf(mascaraCpf(v))} placeholder="000.000.000-00" placeholderTextColor={cores.textoSuave}
                    keyboardType="number-pad" maxLength={14} style={styles.input} editable={!enviando} />
                </Campo>
                <Campo label="E-mail">
                  <TextInput value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor={cores.textoSuave}
                    autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} editable={!enviando} />
                </Campo>
                <Campo label="Telefone (opcional)">
                  <TextInput value={telefone} onChangeText={(v) => setTelefone(mascaraTelefone(v))} placeholder="(11) 99999-9999" placeholderTextColor={cores.textoSuave}
                    keyboardType="phone-pad" maxLength={15} style={styles.input} editable={!enviando} />
                </Campo>

                <Pressable onPress={() => setTemProblemaMemoria((v) => !v)} style={styles.check} hitSlop={6} disabled={enviando}>
                  <View style={[styles.checkBox, temProblemaMemoria && styles.checkBoxOn]}>
                    {temProblemaMemoria && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkTexto}>Tenho dificuldade de memória e posso precisar de apoio</Text>
                </Pressable>
              </View>

              {/* Declaração de saúde */}
              <View style={styles.secao}>
                <Text style={styles.secaoTitulo}>Declaração de saúde</Text>
                {perguntasOrdenadas.map((p, i) => {
                  const r = respostas[p.perguntaId];
                  const sim = r?.resposta === true;
                  const nao = r?.resposta === false;
                  return (
                    <View key={p.perguntaId} style={styles.pergunta}>
                      <Text style={styles.perguntaTexto}>{i + 1}. {p.pergunta}</Text>
                      <View style={styles.simNaoRow}>
                        <Pressable onPress={() => setResposta(p.perguntaId, true)} disabled={enviando}
                          style={[styles.pill, sim && styles.pillSim]}>
                          <Text style={[styles.pillTexto, sim && styles.pillTextoAtivo]}>Sim</Text>
                        </Pressable>
                        <Pressable onPress={() => setResposta(p.perguntaId, false)} disabled={enviando}
                          style={[styles.pill, nao && styles.pillNao]}>
                          <Text style={[styles.pillTexto, nao && styles.pillTextoAtivo]}>Não</Text>
                        </Pressable>
                      </View>
                      {sim && (
                        <TextInput value={r.detalhe} onChangeText={(v) => setDetalhe(p.perguntaId, v)}
                          placeholder="Detalhe (obrigatório)…" placeholderTextColor={cores.textoSuave}
                          multiline style={[styles.input, styles.inputDetalhe]} editable={!enviando} />
                      )}
                    </View>
                  );
                })}
              </View>

              {erro && <Text style={styles.erro}>{erro}</Text>}

              <Pressable onPress={enviar} disabled={enviando} style={[styles.botao, enviando && styles.botaoDesab]}>
                {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Enviar solicitação</Text>}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cores.fundo },
  flex: { flex: 1 },
  topo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  voltarBtn: { padding: 2 },
  topoTitulo: { fontSize: 17, fontWeight: '800', color: cores.texto },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  centro: { paddingVertical: 60, alignItems: 'center' },

  avisoCard: {
    backgroundColor: cores.alertaFundo, borderRadius: 16, padding: 20, gap: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#FDE68A',
  },
  avisoTexto: { fontSize: 14, color: cores.textoMedio, fontWeight: '500', textAlign: 'center', lineHeight: 21 },

  intro: { fontSize: 14, color: cores.textoSecundario, fontWeight: '500', lineHeight: 21 },
  introForte: { fontWeight: '800', color: cores.texto },

  secao: {
    backgroundColor: cores.superficie, borderRadius: 18, padding: 18, gap: 16,
    borderWidth: 1, borderColor: cores.borda,
  },
  secaoTitulo: { fontSize: 15, fontWeight: '800', color: cores.texto },
  campo: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 2 },
  input: {
    borderWidth: 1, borderColor: cores.borda, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, fontWeight: '600', color: cores.texto, backgroundColor: cores.neutroSuave,
  },
  inputDetalhe: { marginTop: 10, minHeight: 64, textAlignVertical: 'top' },

  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  checkTexto: { flex: 1, fontSize: 13, fontWeight: '600', color: cores.textoMedio, lineHeight: 18 },

  pergunta: { gap: 10 },
  perguntaTexto: { fontSize: 14, fontWeight: '600', color: cores.texto, lineHeight: 20 },
  simNaoRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: cores.borda,
    backgroundColor: cores.neutroSuave, alignItems: 'center',
  },
  pillSim: { backgroundColor: cores.alertaFundo, borderColor: '#FDE68A' },
  pillNao: { backgroundColor: cores.sucessoFundo, borderColor: '#A7F3D0' },
  pillTexto: { fontSize: 14, fontWeight: '700', color: cores.textoSecundario },
  pillTextoAtivo: { color: cores.texto },

  erro: { color: cores.erro, fontSize: 13, fontWeight: '600', marginLeft: 2 },
  botao: { backgroundColor: cores.primaria, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  botaoDesab: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  sucessoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  sucessoIcone: { marginBottom: 4 },
  sucessoTitulo: { fontSize: 22, fontWeight: '800', color: cores.texto, textAlign: 'center' },
  sucessoTexto: { fontSize: 14, color: cores.textoSecundario, fontWeight: '500', textAlign: 'center', lineHeight: 21, marginBottom: 12 },
});
