import type { AlertButton } from 'react-native';

// Versão web do alertar: o Alert.alert do React Native não faz nada no navegador, então a
// confirmação de cancelar uma consulta, sair etc. simplesmente sumia. O navegador só tem
// "OK" e "Cancelar", então os botões do alerta viram:
//   - só um aviso (ou um botão): alert() e, depois, a ação do botão;
//   - uma ação + "cancelar": confirm(); OK executa a ação, Cancelar executa o cancelar;
//   - várias ações: um confirm() por ação, na ordem, até o usuário aceitar uma.
export function alertar(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;
  const acoes = (botoes ?? []).filter((b) => b.style !== 'cancel');
  const cancelar = (botoes ?? []).find((b) => b.style === 'cancel');

  if (!cancelar && acoes.length <= 1) {
    window.alert(texto);
    acoes[0]?.onPress?.();
    return;
  }
  if (acoes.length === 1) {
    if (window.confirm(texto)) acoes[0].onPress?.();
    else cancelar?.onPress?.();
    return;
  }
  for (const acao of acoes) {
    if (window.confirm(`${texto}\n\n${acao.text}?`)) {
      acao.onPress?.();
      return;
    }
  }
  cancelar?.onPress?.();
}
