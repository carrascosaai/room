import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAccountSync } from '@/auth/useAccountSync';
import { useNativeCaptures } from '@/capture/useNativeCaptures';
import { useI18n } from '@/i18n';
import { scheduleWeeklySummary } from '@/notifications/local';
import { StoreProvider, useStore } from '@/store/store';
import { useGroupSync } from '@/sync/useGroupSync';
import { colors } from '@/ui/theme';

/** Tareas de fondo mientras la app está abierta. */
function BackgroundWork() {
  const { state } = useStore();
  const i18n = useI18n();
  useNativeCaptures(i18n.t('capture.defaultMerchant'));
  useGroupSync();
  useAccountSync();

  // Resumen semanal con los números al día y en el idioma elegido.
  const summaryKey = `${state.expenses.length}:${JSON.stringify(state.budgets)}:${i18n.lang}:${i18n.currency}`;
  useEffect(() => {
    if (state.onboarded) scheduleWeeklySummary(state, i18n).catch(() => {});
  }, [summaryKey, state.onboarded]);
  return null;
}

function RootStack() {
  const { ready } = useStore();
  const { t } = useI18n();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <>
      <BackgroundWork />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="capture" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join" options={{ presentation: 'modal' }} />
        <Stack.Screen name="language" options={{ presentation: 'modal' }} />
        <Stack.Screen name="automation" options={{ headerShown: true, title: t('automation.screenTitle') }} />
        <Stack.Screen name="group/[id]" options={{ headerShown: true, title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <RootStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
