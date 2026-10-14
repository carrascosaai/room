import type { CategoryStatus } from '@/domain/budget';
import { monthSummary } from '@/domain/budget';
import { plainAmount } from '@/domain/money';
import type { AppState, Cents, PaymentInfo } from '@/domain/types';
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

/** Usuario limpio a partir de lo que pegue la gente: "@ana", "paypal.me/ana", "https://revolut.me/ana". */
export function handle(value: string): string {
  return value.trim().replace(/^https?:\/\//, '').replace(/^(www\.)?(paypal\.me|revolut\.me)\//i, '').replace(/^@/, '').split(/[/?\s]/)[0];
}

/** Líneas para que te paguen: Bizum, IBAN y enlaces de PayPal y Revolut con el importe. */
export function paymentLines(payment: PaymentInfo | undefined, amount: Cents, currency: string): string[] {
  if (!payment) return [];
  const lines: string[] = [];
  if (payment.bizum) lines.push(`Bizum: ${payment.bizum}`);
  if (payment.iban) lines.push(`IBAN: ${payment.iban.toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()}`);
  if (payment.paypal && handle(payment.paypal)) lines.push(`PayPal: https://paypal.me/${handle(payment.paypal)}/${plainAmount(amount, currency)}${currency}`);
  if (payment.revolut && handle(payment.revolut)) lines.push(`Revolut: https://revolut.me/${handle(payment.revolut)}`);
  return lines;
}
