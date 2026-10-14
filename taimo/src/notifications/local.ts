import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppState } from '@/domain/types';
import type { I18n } from '@/i18n';
import { weeklySummaryText } from '@/ui/messages';

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

/**
 * Programa (o actualiza) el resumen de los domingos a las 20:00. Se reprograma
 * cada vez que se abre la app para que lleve los números al día.
 */
export async function scheduleWeeklySummary(state: Pick<AppState, 'expenses' | 'groups' | 'budgets'>, i18n: I18n) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: { title: i18n.t('notif.weeklyTitle'), body: weeklySummaryText(i18n, state) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 20, minute: 0 },
  });
}

/** Aviso inmediato (p. ej. "Te has pasado en Comer fuera") si hay permiso. */
export async function notifyNow(title: string, body: string) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}

const SUB_PREFIX = 'taimo-sub-';

/**
 * Un aviso a las 10:00 del día antes de cada cobro de suscripción: «Mañana te
 * cobran Netflix (12,99 €). ¿Lo sigues usando?». Se reprograma al abrir la app.
 */
export async function scheduleSubscriptionAlerts(subs: { merchant: string; monthly: number; next: Date }[], i18n: I18n) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(SUB_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = Date.now();
  for (const s of subs) {
    const when = new Date(s.next);
    when.setDate(when.getDate() - 1);
    when.setHours(10, 0, 0, 0);
    if (when.getTime() <= now || when.getTime() - now > 40 * 86_400_000) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${SUB_PREFIX}${s.merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      content: {
        title: i18n.t('subx.title', { merchant: s.merchant }),
        body: i18n.t('subx.body', { amount: i18n.money(s.monthly) }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  }
}
