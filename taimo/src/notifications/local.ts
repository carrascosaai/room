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
