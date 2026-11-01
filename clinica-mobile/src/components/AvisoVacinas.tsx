import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VACINAS_DISPONIVEIS } from '@/constants/clinica';

// Aviso das vacinas em oferta, exibido quando o agendamento é de vacina (manual ou sugerido pela IA).
export default function AvisoVacinas() {
  return (
    <View style={styles.caixa}>
      <Ionicons name="information-circle" size={18} color="#2C5282" />
      <Text style={styles.texto}>
        No momento, temos disponíveis apenas as vacinas <Text style={styles.destaque}>{VACINAS_DISPONIVEIS}</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EBF8FF', borderWidth: 1, borderColor: '#BEE3F8', borderRadius: 12, padding: 12 },
  texto: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  destaque: { fontWeight: '800', color: '#111827' },
});
