import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAccountSync } from '@/auth/useAccountSync';
import { useNativeCaptures } from '@/capture/useNativeCaptures';
import { dueRecurring } from '@/domain/groupInsights';
import { splitByWeights, splitEqually } from '@/domain/groups';
import { useAutoRefreshRates } from '@/fx/useRates';
import { useI18n } from '@/i18n';
import { scheduleWeeklySummary } from '@/notifications/local';
import { StoreProvider, useStore } from '@/store/store';
import { useGroupSync } from '@/sync/useGroupSync';
import { colors } from '@/ui/theme';

/** Tareas de fondo mientras la app está abierta. */
function BackgroundWork() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  useNativeCaptures(i18n.t('capture.defaultMerchant'));
  useGroupSync();
  useAccountSync();
  useAutoRefreshRates();

  // Gastos fijos de grupos (alquiler, luz…): se apuntan solos cuando llega su día.
  const recurringKey = state.groups.map((g) => `${g.id}:${(g.recurring ?? []).map((r) => r.id + r.day).join()}`).join('|');
  useEffect(() => {
    const today = new Date();
    for (const g of state.groups) {
      if (!g.recurring?.length) continue;
      const ids = g.members.map((m) => m.id);
      const split = (amount: number) =>
        g.weights ? splitByWeights(amount, Object.fromEntries(ids.map((id) => [id, g.weights![id] ?? 1]))) : splitEqually(amount, ids);
      const due = dueRecurring(g, state.expenses, today, split);
      if (due.length) dispatch({ type: 'importExpenses', expenses: due });
    }
  }, [recurringKey, state.expenses.length]);

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
        <Stack.Screen name="goals" options={{ headerShown: true, title: t('goal.title') }} />
        <Stack.Screen name="history" options={{ headerShown: true, title: t('history.title') }} />
        <Stack.Screen name="converter" options={{ headerShown: true, title: t('fx.title') }} />
        <Stack.Screen name="group/new" options={{ headerShown: true, title: t('groups.newGroup') }} />
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
