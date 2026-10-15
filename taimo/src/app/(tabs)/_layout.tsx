import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { useEffect } from 'react';
import { Platform, Text } from 'react-native';

import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { useFontScale } from '@/ui/components';
import { colors } from '@/ui/theme';

function icon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  const { state } = useStore();
  const { t } = useI18n();
  const fs = useFontScale();
  // Modo sencillo: solo Inicio y Más (Grupos y Resumen siguen en «Más»).
  const simple = !!state.profile.simple;
  // Accesos rápidos del icono (mantener pulsado): «Apuntar gasto», «Escanear ticket»…
  useQuickActionRouting();
  useEffect(() => {
    QuickActions.setItems([
      { id: 'add', title: t('qa.add'), icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined, params: { href: '/add' } },
      { id: 'scan', title: t('scan.button').replace(/^📷\s*/, ''), icon: Platform.OS === 'ios' ? 'symbol:camera' : undefined, params: { href: '/add?scan=1' } },
      { id: 'ask', title: t('asst.title'), icon: Platform.OS === 'ios' ? 'symbol:bubble.left' : undefined, params: { href: '/assistant' } },
    ]).catch(() => {});
  }, [t]);
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 72, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: fs(14), fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="groups" options={{ title: t('tabs.groups'), tabBarIcon: icon('👥'), href: simple ? null : undefined }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats'), tabBarIcon: icon('📊'), href: simple ? null : undefined }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: icon('☰') }} />
    </Tabs>
  );
}
