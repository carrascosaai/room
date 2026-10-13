import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNativeCaptures } from '@/capture/useNativeCaptures';
import { scheduleWeeklySummary } from '@/notifications/local';
import { StoreProvider, useStore } from '@/store/store';
import { useGroupSync } from '@/sync/useGroupSync';
import { colors } from '@/ui/theme';

/** Tareas de fondo mientras la app está abierta. */
function BackgroundWork() {
  const { state } = useStore();
  useNativeCaptures();
  useGroupSync();

  // Resumen semanal con los números al día (solo si el usuario dio permiso).
  const summaryKey = `${state.expenses.length}:${JSON.stringify(state.budgets)}`;
  useEffect(() => {
    if (state.onboarded) scheduleWeeklySummary(state).catch(() => {});
  }, [summaryKey, state.onboarded]);
  return null;
}

function RootStack() {
  const { ready } = useStore();
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
        <Stack.Screen name="automation" options={{ headerShown: true, title: 'Registro automático' }} />
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
