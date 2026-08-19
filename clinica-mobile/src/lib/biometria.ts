import * as LocalAuthentication from 'expo-local-authentication';

// Camada fina sobre expo-local-authentication. Isola a UI dos detalhes da API
// nativa e centraliza as mensagens em pt-BR.

// O aparelho tem hardware biométrico E pelo menos uma digital/face cadastrada?
export async function biometriaDisponivel(): Promise<boolean> {
  try {
    const temHardware = await LocalAuthentication.hasHardwareAsync();
    if (!temHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

// Rótulo do tipo de biometria disponível, para textos da UI.
export async function rotuloBiometria(): Promise<string> {
  try {
    const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'reconhecimento facial';
    if (tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'digital';
    return 'biometria';
  } catch {
    return 'biometria';
  }
}

// Lock de módulo: no Android, duas chamadas concorrentes a authenticateAsync
// travam o prompt nativo (fica carregando sem aparecer). Garante uma por vez,
// mesmo com remontagens/StrictMode.
let autenticando = false;

// Dispara o prompt nativo. Retorna true só em sucesso. `fallbackSenhaDispositivo`
// permite cair na senha/PIN do aparelho (útil para desbloquear o app).
export async function autenticarBiometria(
  motivo: string,
  fallbackSenhaDispositivo = true,
): Promise<boolean> {
  if (autenticando) return false;
  autenticando = true;
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: !fallbackSenhaDispositivo,
    });
    return r.success;
  } catch {
    return false;
  } finally {
    autenticando = false;
  }
}
