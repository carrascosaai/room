import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { monthSummary } from '@/domain/budget';
import { formatMoney } from '@/domain/money';
import type { AppState } from '@/domain/types';

const WEEKLY_ID = 'taimo-weekly-summary';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Texto del resumen semanal con los datos de ahora mismo. */
export function weeklySummaryText(state: Pick<AppState, 'expenses' | 'groups' | 'budgets'>, today = new Date()): string {
  const s = monthSummary(state, today);
  if (s.budget === 0) return `Llevas ${formatMoney(s.spent)} gastados este mes.`;
  if (s.remaining < 0) return `Este mes te has pasado ${formatMoney(-s.remaining)}. ¡La semana que viene, a por ello!`;
  return `Llevas ${formatMoney(s.spent)} este mes y te quedan ${formatMoney(s.remaining)}: unos ${formatMoney(
    s.dailyAllowance,
  )} al día.`;
}

/**
 * Programa (o actualiza) el resumen de los domingos a las 20:00. Se reprograma
 * cada vez que se abre la app para que lleve los números al día.
 */
export async function scheduleWeeklySummary(state: Pick<AppState, 'expenses' | 'groups' | 'budgets'>) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: { title: 'Tu semana en Taimo 📊', body: weeklySummaryText(state) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 20, minute: 0 },
  });
}
