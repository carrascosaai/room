import type { CategoryStatus } from '@/domain/budget';
import { monthSummary } from '@/domain/budget';
import type { AppState } from '@/domain/types';
import type { I18n } from '@/i18n';

/** Frase que se muestra justo después de apuntar un gasto. */
export function purchaseMessage(i18n: I18n, status: CategoryStatus): string {
  const category = i18n.t(`cat.${status.category}`);
  const amount = i18n.money(Math.abs(status.remaining));
  if (status.level === 'none') return i18n.t('budgetMsg.logged', { category });
  if (status.level === 'over') return i18n.t('budgetMsg.over', { amount, category });
  if (status.level === 'warning') return i18n.t('budgetMsg.warning', { amount, category });
  return i18n.t('budgetMsg.ok', { amount, category });
}

/** Texto del resumen semanal con los números de ahora. */
export function weeklySummaryText(i18n: I18n, state: Pick<AppState, 'expenses' | 'groups' | 'budgets'>, today = new Date()): string {
  const s = monthSummary(state, today);
  if (s.budget === 0) return i18n.t('notif.weeklyNoBudget', { spent: i18n.money(s.spent) });
  if (s.remaining < 0) return i18n.t('notif.weeklyOver', { amount: i18n.money(-s.remaining) });
  return i18n.t('notif.weeklyOk', {
    spent: i18n.money(s.spent),
    left: i18n.money(s.remaining),
    perDay: i18n.money(s.dailyAllowance),
  });
}

/** "Hoy, 14:05" / "Ayer, 09:12" / "3 oct". */
export function formatWhen(i18n: I18n, iso: string, now = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = i18n.date(d, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return i18n.t('common.today', { time });
  if (d.toDateString() === yesterday.toDateString()) return i18n.t('common.yesterday', { time });
  return i18n.date(d, { day: 'numeric', month: 'short' });
}
