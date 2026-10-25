import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AZUL = '#2C5282';
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function iso(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

interface Props {
  ano: number;
  mes: number; // 0..11 (como Date)
  disponiveis: string[]; // yyyy-MM-dd com horário livre
  selecionado: string | null;
  carregando: boolean;
  podeVoltar: boolean;
  podeAvancar: boolean;
  onSelecionar: (iso: string) => void;
  onMudarMes: (delta: 1 | -1) => void;
}

// Calendário mensal: dias com horário livre em azul (tocáveis), demais em cinza.
export default function CalendarioMes({
  ano,
  mes,
  disponiveis,
  selecionado,
  carregando,
  podeVoltar,
  podeAvancar,
  onSelecionar,
  onMudarMes,
}: Props) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const livres = new Set(disponiveis);

  // Células: vazias até o 1º dia da semana, depois os dias; completa a última semana.
  const celulas: (number | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.cabecalho}>
        <Pressable
          onPress={() => onMudarMes(-1)}
          disabled={!podeVoltar}
          hitSlop={10}
          style={[styles.seta, !podeVoltar && styles.setaOff]}
          accessibilityLabel="Mês anterior"
        >
          <Ionicons name="chevron-back" size={18} color={podeVoltar ? '#111827' : '#D1D5DB'} />
        </Pressable>
        <Text style={styles.mesTitulo}>
          {MESES[mes]} {ano}
        </Text>
        <Pressable
          onPress={() => onMudarMes(1)}
          disabled={!podeAvancar}
          hitSlop={10}
          style={[styles.seta, !podeAvancar && styles.setaOff]}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={18} color={podeAvancar ? '#111827' : '#D1D5DB'} />
        </Pressable>
      </View>

      <View style={styles.linha}>
        {SEMANA.map((d, i) => (
          <Text key={i} style={styles.semana}>
            {d}
          </Text>
        ))}
      </View>

      <View>
        <View style={styles.grade}>
          {celulas.map((dia, i) => {
            if (dia == null) return <View key={i} style={styles.celula} />;
            const data = iso(ano, mes, dia);
            const livre = livres.has(data);
            const ativo = selecionado === data;
            return (
              <View key={i} style={styles.celula}>
                <Pressable
                  onPress={() => onSelecionar(data)}
                  disabled={!livre || carregando}
                  style={[styles.dia, livre && styles.diaLivre, ativo && styles.diaAtivo]}
                  accessibilityLabel={`${dia} de ${MESES[mes]}${livre ? '' : ', indisponível'}`}
                >
                  <Text style={[styles.diaTexto, livre && styles.diaTextoLivre, ativo && styles.diaTextoAtivo]}>
                    {dia}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        {carregando && (
          <View style={styles.carregando}>
            <ActivityIndicator color={AZUL} />
          </View>
        )}
      </View>

      <View style={styles.legenda}>
        <View style={[styles.bolinha, styles.diaLivre]} />
        <Text style={styles.legendaTexto}>Com horário</Text>
        <View style={[styles.bolinha, styles.bolinhaOff]} />
        <Text style={styles.legendaTexto}>Sem horário</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 18, padding: 14, gap: 8 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  mesTitulo: { fontSize: 16, fontWeight: '800', color: '#111827' },
  seta: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  setaOff: { backgroundColor: '#F9FAFB' },
  linha: { flexDirection: 'row' },
  semana: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celula: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dia: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  diaLivre: { backgroundColor: '#EEF2F7' },
  diaAtivo: { backgroundColor: AZUL },
  diaTexto: { fontSize: 15, fontWeight: '600', color: '#D1D5DB' },
  diaTextoLivre: { color: AZUL, fontWeight: '800' },
  diaTextoAtivo: { color: '#fff' },
  carregando: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  legenda: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bolinha: { width: 12, height: 12, borderRadius: 4 },
  bolinhaOff: { backgroundColor: '#F3F4F6' },
  legendaTexto: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginRight: 10 },
});
