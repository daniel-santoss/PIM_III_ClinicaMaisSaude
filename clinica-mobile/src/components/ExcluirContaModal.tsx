import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { excluirConta } from '@/lib/perfil';

interface Props {
  visivel: boolean;
  onClose: () => void;
  onExcluida: () => void;
}

// Confirmação de exclusão de conta. Exige a senha (o backend revalida) e deixa
// claro que a ação encerra o acesso. Ação destrutiva → cor vermelha.
export default function ExcluirContaModal({ visivel, onClose, onExcluida }: Props) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!visivel) {
      setSenha('');
      setErro(null);
      setExcluindo(false);
    }
  }, [visivel]);

  async function confirmar() {
    if (senha.length === 0 || excluindo) return;
    setErro(null);
    setExcluindo(true);
    try {
      await excluirConta(senha);
      onExcluida();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a conta.');
      setExcluindo(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fundo} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.iconeWrap}>
          <Ionicons name="warning" size={28} color="#B91C1C" />
        </View>

        <Text style={styles.titulo}>Excluir minha conta</Text>
        <Text style={styles.texto}>
          Esta ação encerra sua conta e você perde o acesso ao aplicativo. Para
          confirmar, digite sua senha.
        </Text>

        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="Sua senha"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          editable={!excluindo}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.rodape}>
          <Pressable onPress={onClose} disabled={excluindo} style={styles.botaoSec}>
            <Text style={styles.botaoSecTexto}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={confirmar}
            disabled={senha.length === 0 || excluindo}
            style={({ pressed }) => [
              styles.botaoExcluir,
              (senha.length === 0 || excluindo) && styles.botaoOff,
              pressed && senha.length > 0 && !excluindo && { opacity: 0.85 },
            ]}
          >
            {excluindo ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoExcluirTexto}>Excluir conta</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 28, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginBottom: 4 },
  iconeWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  texto: { fontSize: 14, fontWeight: '500', color: '#4B5563', lineHeight: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginTop: 4,
  },
  erro: { color: '#B91C1C', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  rodape: { flexDirection: 'row', gap: 12, marginTop: 4 },
  botaoSec: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F3F4F6' },
  botaoSecTexto: { color: '#6B7280', fontWeight: '800', fontSize: 14 },
  botaoExcluir: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#B91C1C' },
  botaoOff: { opacity: 0.5 },
  botaoExcluirTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
