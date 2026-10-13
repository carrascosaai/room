import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { useStore } from '@/store/store';
import { colors } from '@/ui/theme';

function icon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="stats" options={{ title: 'Estadísticas', tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
