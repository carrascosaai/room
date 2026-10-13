import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/store/store';
import { colors } from '@/ui/theme';

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
      <Stack.Screen name="automation" options={{ headerShown: true, title: 'Registro automático' }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: true, title: '' }} />
    </Stack>
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
