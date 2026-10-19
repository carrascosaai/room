import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState as RNAppState, Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setIgnoredApps } from 'taimo-capture';

import { unlock } from '@/auth/lock';
import { useAccountSync } from '@/auth/useAccountSync';
import { useNativeCaptures } from '@/capture/useNativeCaptures';
import { dueRecurring } from '@/domain/groupInsights';
import { detectSubscriptions, nextCharge } from '@/domain/insights';
import { splitByWeights, splitEqually } from '@/domain/groups';
import { useAutoRefreshRates } from '@/fx/useRates';
import { useWidgetSync } from '@/widget/useWidgetSync';
import { useI18n } from '@/i18n';
import { onNotificationOpen, scheduleNightlyReminder, scheduleSubscriptionAlerts, scheduleWeeklySummary } from '@/notifications/local';
import { StoreProvider, useStore } from '@/store/store';
import { useGroupSync } from '@/sync/useGroupSync';
import { applyTheme, colors } from '@/ui/theme';
import { ToastHost } from '@/ui/Toast';

/** Tareas de fondo mientras la app está abierta. */
function BackgroundWork() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  useNativeCaptures(i18n);
  useGroupSync();
  useAccountSync();
  useAutoRefreshRates();
  useWidgetSync(state, i18n);

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

  // El lector nativo de Android tampoco debe anunciar pagos de las apps ignoradas.
  const ignoredKey = (state.ignoredApps ?? []).join();
  useEffect(() => setIgnoredApps(state.ignoredApps ?? []), [ignoredKey]);

  // Aviso el día antes de cada cobro de suscripción.
  const subsKey = `${state.expenses.length}:${i18n.lang}`;
  useEffect(() => {
    const subs = detectSubscriptions(state.expenses).map((sub) => ({ merchant: sub.merchant, monthly: sub.monthly, next: nextCharge(sub) }));
    scheduleSubscriptionAlerts(subs, i18n).catch(() => {});
  }, [subsKey]);

  // Resumen semanal con los números al día y en el idioma elegido.
  const summaryKey = `${state.expenses.length}:${JSON.stringify(state.budgets)}:${i18n.lang}:${i18n.currency}`;
  useEffect(() => {
    if (state.onboarded) scheduleWeeklySummary(state, i18n).catch(() => {});
  }, [summaryKey, state.onboarded]);

  // Recordatorio de cada noche (iPhone, tarjeta de plástico) y abrir la pantalla al tocar un aviso.
  useEffect(() => {
    if (state.onboarded) scheduleNightlyReminder(!!state.profile.nightly, i18n).catch(() => {});
  }, [state.profile.nightly, state.onboarded, i18n.lang]);
  useEffect(() => onNotificationOpen((url) => router.push(url as never)), []);
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
      {/* Las tareas de fondo siguen aunque la app esté bloqueada (no enseñan nada). */}
      <BackgroundWork />
      <LockGate>
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
          <Stack.Screen name="pay" />
          <Stack.Screen name="devuelve" options={{ headerShown: true, title: t('back.title') }} />
          <Stack.Screen name="monedero" options={{ headerShown: true, title: t('cash.title') }} />
          <Stack.Screen name="calendario" options={{ headerShown: true, title: t('cal.title') }} />
          <Stack.Screen name="revisar" options={{ headerShown: true, title: t('rev.title') }} />
          <Stack.Screen name="comprueba" options={{ headerShown: true, title: t('scam.title') }} />
          <Stack.Screen name="opinion" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="mesa" />
          <Stack.Screen name="mesa-pagado" />
          <Stack.Screen name="mesa-nueva" options={{ headerShown: true, title: t('mesa.title') }} />
          <Stack.Screen name="language" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: t('settings.title') }} />
          <Stack.Screen name="wishlist" options={{ headerShown: true, title: t('wish.title') }} />
          <Stack.Screen name="assistant" options={{ headerShown: true, title: t('asst.title') }} />
          <Stack.Screen name="challenges" options={{ headerShown: true, title: t('ch.title') }} />
          <Stack.Screen name="recap" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="goals" options={{ headerShown: true, title: t('goal.title') }} />
          <Stack.Screen name="tu-ano" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="paga" options={{ headerShown: true, title: t('kids.title') }} />
          <Stack.Screen name="history" options={{ headerShown: true, title: t('history.title') }} />
          <Stack.Screen name="converter" options={{ headerShown: true, title: t('fx.title') }} />
          <Stack.Screen name="group/new" options={{ headerShown: true, title: t('groups.newGroup') }} />
          <Stack.Screen name="automation" options={{ headerShown: true, title: t('automation.screenTitle') }} />
          <Stack.Screen name="group/[id]" options={{ headerShown: true, title: '' }} />
        </Stack>
      </LockGate>
    </>
  );
}

/**
 * Bloqueo con Face ID / huella / código: al abrir la app y al volver tras más
 * de un minuto fuera. Mientras está bloqueada no se monta la navegación (así
 * ninguna pantalla modal nativa puede quedar por encima del bloqueo), y al
 * salir de la app se tapa el contenido para que no se vea en el selector de apps.
 */
function LockGate({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const { t } = useI18n();
  const enabled = !!state.profile.lock && Platform.OS !== 'web';
  const [locked, setLocked] = useState(enabled);
  const [covered, setCovered] = useState(false);
  const leftAt = useRef<number | null>(null);
  const tryUnlock = useCallback(async () => {
    if (await unlock(t('lock.reason'))) setLocked(false);
  }, [t]);

  useEffect(() => {
    if (enabled && locked) tryUnlock();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      setCovered(false);
      return;
    }
    const sub = RNAppState.addEventListener('change', (s) => {
      // «inactive» también llega con el aviso de Face ID: solo tapamos, no bloqueamos.
      if (s !== 'active') setCovered(true);
      if (s === 'background') leftAt.current = Date.now();
      if (s === 'active') {
        setCovered(false);
        if (leftAt.current && Date.now() - leftAt.current > 60_000) {
          setLocked(true);
          tryUnlock();
        }
        leftAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled, tryUnlock]);

  // Sin navegación montada, la pantalla de carga no se quita sola.
  useEffect(() => {
    if (enabled && locked) SplashScreen.hideAsync().catch(() => {});
  }, [enabled, locked]);

  if (enabled && locked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{t('lock.locked')}</Text>
        <Pressable
          onPress={tryUnlock}
          accessibilityRole="button"
          style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 16 }}>{t('lock.unlock')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {children}
      {enabled && covered ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
        </View>
      ) : null}
    </>
  );
}

/** Elige claro u oscuro (preferencia o la del móvil) y vuelve a montar la app al cambiar. */
function ThemedRoot() {
  const { state } = useStore();
  const system = useColorScheme();
  const pref = state.profile.theme ?? 'auto';
  const mode = pref === 'auto' ? (system === 'light' ? 'light' : 'dark') : pref;
  applyTheme(mode);
  return (
    <View key={mode} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootStack />
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemedRoot />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
