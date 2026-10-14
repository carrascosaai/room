import { homeOf, monthSummary, myShare, type ShareState } from './budget';
import type { AppState, Cents } from './types';

export interface SafeToSpend {
  /** Lo que puedes gastar todavía hoy sin pasarte del mes (nunca negativo). */
  amount: Cents;
  /** Lo que te tocaba para hoy entero (antes de lo gastado hoy). */
  daily: Cents;
  /** Lo tuyo gastado hoy. */
  spentToday: Cents;
  /** Lo que queda del mes (puede ser negativo). */
  remaining: Cents;
  /** Días que quedan del mes, incluido hoy. */
  daysLeft: number;
  /** Te has pasado del presupuesto del mes. */
  over: boolean;
  /** Lo que tendrás para mañana si hoy no gastas más (0 si hoy es el último día del mes). */
  tomorrow: Cents;
}

const sameDay = (iso: string, d: Date) => {
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};

/** Lo mío gastado hoy (en un gasto compartido, solo mi parte). */
export function spentOn(state: ShareState, day: Date): Cents {
  const home = homeOf(state);
  return state.expenses.filter((e) => sameDay(e.date, day)).reduce((s, e) => s + myShare(e, state.groups, home), 0);
}

/**
 * «Hoy puedes gastar»: lo que quedaba del mes al empezar el día, repartido entre
 * los días que faltan (hoy incluido), menos lo que ya has gastado hoy.
 * Sin presupuesto no hay cifra (null).
 */
export function safeToSpendToday(state: ShareState & Pick<AppState, 'budgets'>, today: Date = new Date()): SafeToSpend | null {
  const s = monthSummary(state, today);
  if (s.budget <= 0) return null;
  const spentToday = spentOn(state, today);
  const atStartOfDay = s.remaining + spentToday;
  const daily = atStartOfDay > 0 ? Math.floor(atStartOfDay / s.daysLeft) : 0;
  const amount = Math.max(0, daily - spentToday);
  const tomorrow = s.daysLeft > 1 && s.remaining > 0 ? Math.floor(s.remaining / (s.daysLeft - 1)) : 0;
  return { amount, daily, spentToday, remaining: s.remaining, daysLeft: s.daysLeft, over: s.remaining <= 0, tomorrow };
}
