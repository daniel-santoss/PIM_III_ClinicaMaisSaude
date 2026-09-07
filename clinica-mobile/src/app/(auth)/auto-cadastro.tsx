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
import { isEmailValido, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/validadores';
import {
  confirmarVerificacaoEmail,
  obterDeclaracao,
  solicitarCadastro,
  solicitarVerificacaoEmail,
  type ModeloDeclaracao,
} from '@/lib/autoCadastro';

type RespostaState = { resposta: boolean | null; detalhe: string };

// Etapas do wizard: termos -> dados -> confirmação do e-mail -> declaração de saúde -> sucesso.
type Etapa = 'termos' | 'dados' | 'codigo' | 'ds' | 'sucesso';

const TERMOS_VERSAO = '1.0';

const PASSOS: { chave: Etapa; rotulo: string }[] = [
  { chave: 'termos', rotulo: 'Termos' },
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'codigo', rotulo: 'E-mail' },
  { chave: 'ds', rotulo: 'Saúde' },
];

export default function AutoCadastroScreen() {
  const router = useRouter();

  const [etapa, setEtapa] = useState<Etapa>('termos');
  const [carregando, setCarregando] = useState(true);
  const [modelo, setModelo] = useState<ModeloDeclaracao | null>(null);
  const [falhaCarregar, setFalhaCarregar] = useState(false);

  // Termos
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Dados
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [temProblemaMemoria, setTemProblemaMemoria] = useState(false);

  // Confirmação de e-mail
  const [codigo, setCodigo] = useState('');
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);

  // Declaração de saúde
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});

  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
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

  // ── Transições ─────────────────────────────────────────────────────────────

  function validarDados(): string | null {
    if (!nome.trim()) return 'Informe o nome completo.';
    if (soDigitos(cpf).length !== 11) return 'Informe um CPF válido (11 dígitos).';
    if (!isEmailValido(email)) return 'Informe um e-mail válido.';
    const tel = soDigitos(telefone);
    if (tel.length !== 10 && tel.length !== 11) return 'Informe um telefone com DDD (10 ou 11 dígitos).';
    return null;
  }

  async function enviarCodigo() {
    const msg = validarDados();
    if (msg) { setErro(msg); return; }
    setErro(null);
    setOcupado(true);
    try {
      await solicitarVerificacaoEmail(email.trim());
      setCodigo('');
      setTokenEmail(null);
      setEtapa('codigo');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarCodigo() {
    const cod = codigo.trim().toUpperCase();
    if (cod.length !== 6) { setErro('Digite o código de 6 caracteres.'); return; }
    setErro(null);
    setOcupado(true);
    try {
      const token = await confirmarVerificacaoEmail(email.trim(), cod);
      setTokenEmail(token);
      setEtapa('ds');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Código inválido ou expirado.');
    } finally {
      setOcupado(false);
    }
  }

  function validarDS(): string | null {
    for (const p of perguntasOrdenadas) {
      const r = respostas[p.perguntaId];
      if (!r || r.resposta === null) return 'Responda todas as perguntas da declaração de saúde.';
      if (r.resposta && !r.detalhe.trim()) return 'As respostas "Sim" exigem um detalhamento.';
    }
    return null;
  }

  async function enviarSolicitacao() {
    if (!modelo || !tokenEmail) return;
    const msg = validarDS();
    if (msg) { setErro(msg); return; }
    setErro(null);
    setOcupado(true);
    try {
      const mensagem = await solicitarCadastro({
        nome: nome.trim(),
        cpf: soDigitos(cpf),
        email: email.trim(),
        telefone: soDigitos(telefone),
        temProblemaMemoria,
        aceiteTermos: aceitouTermos,
        emailVerificadoToken: tokenEmail,
        modeloId: modelo.modeloId,
        respostas: perguntasOrdenadas.map((p) => {
          const r = respostas[p.perguntaId];
          return { perguntaId: p.perguntaId, resposta: !!r.resposta, detalhe: r.resposta ? r.detalhe.trim() : null };
        }),
      });
      setSucesso(mensagem);
      setEtapa('sucesso');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setOcupado(false);
    }
  }

  const idxAtual = PASSOS.findIndex((p) => p.chave === etapa);

  // ── Sucesso ──────────────────────────────────────────────────────────────────
  if (etapa === 'sucesso') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.sucessoWrap}>
          <Ionicons name="checkmark-circle" size={64} color={cores.sucesso} />
          <Text style={styles.sucessoTitulo}>Solicitação enviada!</Text>
          <Text style={styles.sucessoTexto}>{sucesso}</Text>
          <Text style={styles.sucessoConfirmacao}>
            Enviamos uma confirmação para <Text style={styles.introForte}>{email.trim()}</Text>.
          </Text>
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
              {/* Stepper */}
              <View style={styles.stepper}>
                {PASSOS.map((p, i) => {
                  const feito = i < idxAtual;
                  const atual = i === idxAtual;
                  return (
                    <View key={p.chave} style={styles.stepItem}>
                      <View style={[styles.stepBadge, atual && styles.stepBadgeAtual, feito && styles.stepBadgeFeito]}>
                        <Text style={[styles.stepNum, (atual || feito) && styles.stepNumAtivo]}>{feito ? '✓' : i + 1}</Text>
                        <Text style={[styles.stepRotulo, atual && styles.stepRotuloAtual, feito && styles.stepRotuloFeito]}>
                          {p.rotulo}
                        </Text>
                      </View>
                      {i < PASSOS.length - 1 && <View style={[styles.stepLinha, feito && styles.stepLinhaFeita]} />}
                    </View>
                  );
                })}
              </View>

              {/* ── Etapa: Termos ── */}
              {etapa === 'termos' && (
                <View style={styles.secao}>
                  <View style={styles.tituloComIcone}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={cores.primaria} />
                    <Text style={styles.secaoTitulo}>Termos de uso e proteção de dados</Text>
                  </View>
                  <ScrollView style={styles.termosBox} nestedScrollEnabled>
                    <Text style={styles.termosTexto}>
                      Ao criar seu cadastro na <Text style={styles.introForte}>Clínica Mais Saúde</Text>, você concorda em
                      fornecer dados pessoais e informações de saúde verdadeiras, usados exclusivamente para a sua
                      avaliação, atendimento e acompanhamento clínico.
                    </Text>
                    <Text style={styles.termosTexto}>
                      Em conformidade com a <Text style={styles.introForte}>Lei Geral de Proteção de Dados (LGPD, Lei nº
                      13.709/2018)</Text>, seus dados são tratados com confidencialidade, armazenados de forma segura e
                      não são compartilhados com terceiros sem a sua autorização, salvo obrigação legal.
                    </Text>
                    <Text style={styles.termosTexto}>
                      A conclusão do cadastro depende de uma <Text style={styles.introForte}>avaliação presencial</Text> na
                      clínica. Você pode solicitar a qualquer momento a consulta, correção ou exclusão dos seus dados
                      junto à recepção.
                    </Text>
                    <Text style={styles.termosNota}>
                      Este é um texto genérico e será substituído pela versão oficial dos termos. (v{TERMOS_VERSAO})
                    </Text>
                  </ScrollView>

                  <Pressable onPress={() => setAceitouTermos((v) => !v)} style={styles.check} hitSlop={6}>
                    <View style={[styles.checkBox, aceitouTermos && styles.checkBoxOn]}>
                      {aceitouTermos && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checkTexto}>
                      Li e aceito os termos de uso e autorizo o tratamento dos meus dados pessoais conforme descrito acima.
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => setEtapa('dados')} disabled={!aceitouTermos}
                    style={[styles.botao, !aceitouTermos && styles.botaoDesab]}>
                    <Text style={styles.botaoTexto}>Continuar</Text>
                  </Pressable>
                </View>
              )}

              {/* ── Etapa: Dados ── */}
              {etapa === 'dados' && (
                <View style={styles.secao}>
                  <Text style={styles.secaoTitulo}>Seus dados</Text>

                  <Campo label="Nome completo">
                    <TextInput value={nome} onChangeText={setNome} placeholder="Nome completo" placeholderTextColor={cores.textoSuave}
                      style={styles.input} editable={!ocupado} />
                  </Campo>
                  <Campo label="CPF">
                    <TextInput value={cpf} onChangeText={(v) => setCpf(mascaraCpf(v))} placeholder="000.000.000-00" placeholderTextColor={cores.textoSuave}
                      keyboardType="number-pad" maxLength={14} style={styles.input} editable={!ocupado} />
                  </Campo>
                  <Campo label="Telefone">
                    <TextInput value={telefone} onChangeText={(v) => setTelefone(mascaraTelefone(v))} placeholder="(11) 99999-9999" placeholderTextColor={cores.textoSuave}
                      keyboardType="phone-pad" maxLength={15} style={styles.input} editable={!ocupado} />
                  </Campo>
                  <Campo label="E-mail">
                    <TextInput value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor={cores.textoSuave}
                      autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} editable={!ocupado} />
                    <Text style={styles.ajuda}>Enviaremos um código para confirmar este e-mail.</Text>
                  </Campo>

                  <Pressable onPress={() => setTemProblemaMemoria((v) => !v)} style={styles.check} hitSlop={6} disabled={ocupado}>
                    <View style={[styles.checkBox, temProblemaMemoria && styles.checkBoxOn]}>
                      {temProblemaMemoria && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checkTexto}>Tenho dificuldade de memória e posso precisar de apoio</Text>
                  </Pressable>

                  {erro && <Text style={styles.erro}>{erro}</Text>}

                  <View style={styles.linhaBotoes}>
                    <Pressable onPress={() => { setErro(null); setEtapa('termos'); }} disabled={ocupado} style={styles.botaoSecundario}>
                      <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
                    </Pressable>
                    <Pressable onPress={enviarCodigo} disabled={ocupado} style={[styles.botao, styles.flex, ocupado && styles.botaoDesab]}>
                      {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Enviar código</Text>}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ── Etapa: Confirmação do e-mail ── */}
              {etapa === 'codigo' && (
                <View style={styles.secao}>
                  <View style={styles.tituloComIcone}>
                    <Ionicons name="mail-open-outline" size={18} color={cores.primaria} />
                    <Text style={styles.secaoTitulo}>Confirme seu e-mail</Text>
                  </View>
                  <Text style={styles.intro}>
                    Enviamos um código de 6 caracteres para <Text style={styles.introForte}>{email.trim()}</Text>.
                    Digite-o abaixo para continuar.
                  </Text>

                  <Campo label="Código de verificação">
                    <TextInput
                      value={codigo}
                      onChangeText={(v) => setCodigo(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="ABC123"
                      placeholderTextColor={cores.textoSuave}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={6}
                      style={[styles.input, styles.inputCodigo]}
                      editable={!ocupado}
                    />
                  </Campo>

                  <Pressable onPress={enviarCodigo} disabled={ocupado} hitSlop={6}>
                    <Text style={styles.reenviar}>Não recebeu? Reenviar código</Text>
                  </Pressable>

                  {erro && <Text style={styles.erro}>{erro}</Text>}

                  <View style={styles.linhaBotoes}>
                    <Pressable onPress={() => { setErro(null); setEtapa('dados'); }} disabled={ocupado} style={styles.botaoSecundario}>
                      <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
                    </Pressable>
                    <Pressable onPress={confirmarCodigo} disabled={ocupado || codigo.length !== 6}
                      style={[styles.botao, styles.flex, (ocupado || codigo.length !== 6) && styles.botaoDesab]}>
                      {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Confirmar</Text>}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ── Etapa: Declaração de saúde ── */}
              {etapa === 'ds' && (
                <View style={styles.secao}>
                  <View style={styles.tituloComIcone}>
                    <Ionicons name="mail-open-outline" size={16} color={cores.sucesso} />
                    <Text style={styles.emailOk}>E-mail confirmado</Text>
                  </View>
                  <Text style={styles.secaoTitulo}>Declaração de saúde</Text>
                  <Text style={styles.intro}>
                    Responda às perguntas abaixo. Depois de enviar, compareça à clínica para a{' '}
                    <Text style={styles.introForte}>avaliação presencial</Text>.
                  </Text>

                  {perguntasOrdenadas.map((p, i) => {
                    const r = respostas[p.perguntaId];
                    const sim = r?.resposta === true;
                    const nao = r?.resposta === false;
                    return (
                      <View key={p.perguntaId} style={styles.pergunta}>
                        <Text style={styles.perguntaTexto}>{i + 1}. {p.pergunta}</Text>
                        <View style={styles.simNaoRow}>
                          <Pressable onPress={() => setResposta(p.perguntaId, true)} disabled={ocupado}
                            style={[styles.pill, sim && styles.pillSim]}>
                            <Text style={[styles.pillTexto, sim && styles.pillTextoAtivo]}>Sim</Text>
                          </Pressable>
                          <Pressable onPress={() => setResposta(p.perguntaId, false)} disabled={ocupado}
                            style={[styles.pill, nao && styles.pillNao]}>
                            <Text style={[styles.pillTexto, nao && styles.pillTextoAtivo]}>Não</Text>
                          </Pressable>
                        </View>
                        {sim && (
                          <TextInput value={r.detalhe} onChangeText={(v) => setDetalhe(p.perguntaId, v)}
                            placeholder="Detalhe (obrigatório)…" placeholderTextColor={cores.textoSuave}
                            multiline style={[styles.input, styles.inputDetalhe]} editable={!ocupado} />
                        )}
                      </View>
                    );
                  })}

                  {erro && <Text style={styles.erro}>{erro}</Text>}

                  <Pressable onPress={enviarSolicitacao} disabled={ocupado} style={[styles.botao, ocupado && styles.botaoDesab]}>
                    {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Enviar solicitação</Text>}
                  </Pressable>
                </View>
              )}
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

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie,
  },
  stepBadgeAtual: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  stepBadgeFeito: { backgroundColor: cores.sucessoFundo, borderColor: '#A7F3D0' },
  stepNum: { fontSize: 11, fontWeight: '800', color: cores.textoSuave },
  stepNumAtivo: { color: cores.texto },
  stepRotulo: { fontSize: 11, fontWeight: '700', color: cores.textoSuave },
  stepRotuloAtual: { color: '#fff' },
  stepRotuloFeito: { color: cores.sucesso },
  stepLinha: { width: 12, height: 1, backgroundColor: cores.borda, marginHorizontal: 2 },
  stepLinhaFeita: { backgroundColor: '#A7F3D0' },

  intro: { fontSize: 14, color: cores.textoSecundario, fontWeight: '500', lineHeight: 21 },
  introForte: { fontWeight: '800', color: cores.texto },

  secao: {
    backgroundColor: cores.superficie, borderRadius: 18, padding: 18, gap: 16,
    borderWidth: 1, borderColor: cores.borda,
  },
  tituloComIcone: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secaoTitulo: { fontSize: 15, fontWeight: '800', color: cores.texto },
  emailOk: { fontSize: 12, fontWeight: '700', color: cores.sucesso },

  termosBox: {
    maxHeight: 220, backgroundColor: cores.neutroSuave, borderRadius: 12, borderWidth: 1, borderColor: cores.borda,
    padding: 14,
  },
  termosTexto: { fontSize: 13, color: cores.textoMedio, fontWeight: '500', lineHeight: 20, marginBottom: 10 },
  termosNota: { fontSize: 12, color: cores.textoSuave, fontWeight: '500', lineHeight: 18 },

  campo: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 2 },
  ajuda: { fontSize: 11, color: cores.textoSuave, fontWeight: '500', marginLeft: 2, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: cores.borda, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, fontWeight: '600', color: cores.texto, backgroundColor: cores.neutroSuave,
  },
  inputCodigo: { textAlign: 'center', fontSize: 22, fontWeight: '800', letterSpacing: 8 },
  inputDetalhe: { marginTop: 10, minHeight: 64, textAlignVertical: 'top' },

  reenviar: { fontSize: 13, fontWeight: '700', color: cores.primaria, marginLeft: 2 },

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
  linhaBotoes: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  botao: { backgroundColor: cores.primaria, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  botaoDesab: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  botaoSecundario: {
    paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie,
  },
  botaoSecundarioTexto: { color: cores.textoMedio, fontSize: 15, fontWeight: '700' },

  sucessoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  sucessoTitulo: { fontSize: 22, fontWeight: '800', color: cores.texto, textAlign: 'center' },
  sucessoTexto: { fontSize: 14, color: cores.textoSecundario, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  sucessoConfirmacao: { fontSize: 13, color: cores.textoSecundario, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
});
