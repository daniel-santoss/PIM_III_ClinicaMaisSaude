import { Alert, type AlertButton } from 'react-native';

// Caixa de diálogo do app. No celular é a nativa; no navegador o Alert do React Native não
// faz nada (o Metro usa alerta.web.ts no build para web).
export function alertar(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
  Alert.alert(titulo, mensagem, botoes);
}
