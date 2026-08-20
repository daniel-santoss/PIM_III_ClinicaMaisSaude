// Design system "navy" — espelha o tema atual do web (frontend desktop).
// Fonte de verdade das cores do app. Telas novas devem importar daqui.
export const cores = {
  // Marca (navy)
  primaria: '#2C5282',
  primariaEscura: '#152D5C',
  primariaTint: '#EEF2F7', // fundo suave (avatars, chips, ícones)
  primariaTintForte: '#DBE7F3',

  // Superfícies e texto
  fundo: '#F8FAFC', // fundo de página
  superficie: '#FFFFFF', // cards
  texto: '#0F172A',
  textoSecundario: '#6B7280',
  textoSuave: '#9CA3AF',
  textoMedio: '#374151',

  // Bordas / neutros
  borda: '#E5E7EB',
  bordaSuave: '#F3F4F6',
  neutroSuave: '#F9FAFB',

  // Semânticas (mesma paleta do web)
  sucesso: '#047857',
  sucessoFundo: '#D1FAE5',
  alerta: '#B45309',
  alertaFundo: '#FEF3C7',
  erro: '#B91C1C',
  erroFundo: '#FEE2E2',
} as const;
