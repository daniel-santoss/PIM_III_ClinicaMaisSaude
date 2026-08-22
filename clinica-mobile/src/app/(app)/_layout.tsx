import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { NaoLidasProvider, useNaoLidas } from '@/context/NaoLidasContext';

const AZUL = '#2C5282';

// Grupo protegido: abas do paciente — Início, Consultas, Agendar, Notificações e Perfil.
// O provider de não-lidas envolve as abas para alimentar o badge de Avisos.
export default function AppLayout() {
  return (
    <NaoLidasProvider>
      <AbasPaciente />
    </NaoLidasProvider>
  );
}

function AbasPaciente() {
  const { naoLidas } = useNaoLidas();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AZUL,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: '#F3F4F6' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="consultas"
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="agendar"
        options={{
          title: 'Agendar',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notificacoes"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
          tabBarBadge: naoLidas > 0 ? (naoLidas > 9 ? '9+' : naoLidas) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      {/* Rota acessível pelo Perfil, escondida da barra de abas. */}
      <Tabs.Screen name="configuracoes" options={{ href: null }} />
    </Tabs>
  );
}
