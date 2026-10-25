import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import TelaBloqueio from '@/components/TelaBloqueio';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading, bloqueado } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }

    // Sessão restaurada (ou ausência confirmada): pode esconder o splash.
    SplashScreen.hideAsync();
  }, [session, loading, segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Sobreposição de bloqueio: mantém a navegação montada por baixo. */}
      {session && bloqueado && <TelaBloqueio />}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {Platform.OS === 'web' ? (
        // No navegador, mantém a largura de celular centralizada (o app foi desenhado para ela).
        <View style={styles.fundoWeb}>
          <View style={styles.colunaWeb}>
            <RootNavigator />
          </View>
        </View>
      ) : (
        <RootNavigator />
      )}
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  fundoWeb: { flex: 1, backgroundColor: '#EEF2F7' },
  colunaWeb: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: '#fff', overflow: 'hidden' },
});
