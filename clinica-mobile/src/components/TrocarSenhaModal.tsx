import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { alterarSenha } from '@/lib/perfil';

const ROXO = '#7C3AED';

interface Props {
  visivel: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TrocarSenhaModal({ visivel, onClose, onSuccess }: Props) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Limpa os campos ao abrir/fechar.
  useEffect(() => {
    if (!visivel) {
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
      setSalvando(false);
    }
  }, [visivel]);

  const podeSalvar =
    senhaAtual.length > 0 && novaSenha.length >= 6 && confirmar.length > 0 && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    if (novaSenha !== confirmar) {
      Alert.alert('As senhas não conferem', 'A confirmação deve ser igual à nova senha.');
      return;
    }
    if (novaSenha === senhaAtual) {
      Alert.alert('Senha inválida', 'A nova senha não pode ser igual à atual.');
      return;
    }
    setSalvando(true);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      onSuccess();
    } catch (e) {
      Alert.alert('Não foi possível trocar a senha', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fundo} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.titulo}>Trocar senha</Text>
          <Text style={styles.sub}>A nova senha deve ter ao menos 6 caracteres.</Text>
        </View>

        <View style={styles.corpo}>
          <Text style={styles.label}>Senha atual</Text>
          <TextInput
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!salvando}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Nova senha</Text>
          <TextInput
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!salvando}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Confirmar nova senha</Text>
          <TextInput
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Repita a nova senha"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!salvando}
          />
        </View>

        <View style={styles.rodape}>
          <Pressable onPress={onClose} disabled={salvando} style={styles.botaoSec}>
            <Text style={styles.botaoSecTexto}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={salvar}
            disabled={!podeSalvar}
            style={({ pressed }) => [styles.botao, !podeSalvar && styles.botaoOff, pressed && podeSalvar && { opacity: 0.85 }]}
          >
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 24 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
  corpo: { paddingHorizontal: 24, paddingTop: 8 },
  label: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  rodape: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16 },
  botaoSec: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F3F4F6' },
  botaoSecTexto: { color: '#6B7280', fontWeight: '800', fontSize: 14 },
  botao: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: ROXO },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
