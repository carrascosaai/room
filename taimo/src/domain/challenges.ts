import { daysInMonth, homeOf, myShare, type ShareState } from './budget';
import type { AppState, Cents, CategoryId } from './types';

/**
 * Retos de ahorro de una semana:
 *  - noCategory: 7 días sin gastar en una categoría (comer fuera, compras…)
 *  - lessThanLastWeek: gastar menos que los 7 días anteriores
 *  - noSpendDays: 3 días sin ningún gasto dentro de la semana
 */
export type ChallengeKind = 'noCategory' | 'lessThanLastWeek' | 'noSpendDays';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  category?: CategoryId;
  /** Día de inicio (YYYY-MM-DD). */
  start: string;
  days: number;
}

export interface ChallengeStatus {
  status: 'active' | 'won' | 'failed';
  /** Día del reto (1..days). */
  day: number;
  /** 0..1 para la barra. */
  progress: number;
  spent: Cents;
  target: Cents;
  count: number;
}

const DAY = 86_400_000;
const startOf = (iso: string) => new Date(`${iso}T00:00:00`);

function spentBetween(state: ShareState, from: number, to: number, filter?: (cat: CategoryId) => boolean): Cents {
  const home = homeOf(state);
  let total = 0;
  for (const e of state.expenses) {
    const t = new Date(e.date).getTime();
    if (t < from || t >= to || (filter && !filter(e.category))) continue;
    total += myShare(e, state.groups, home);
  }
  return total;
}

export function evaluateChallenge(ch: Challenge, state: ShareState, today: Date = new Date()): ChallengeStatus {
  const from = startOf(ch.start).getTime();
  const end = from + ch.days * DAY;
  const now = Math.min(today.getTime(), end);
  const day = Math.min(ch.days, Math.max(1, Math.floor((today.getTime() - from) / DAY) + 1));
  const finished = today.getTime() >= end;

  if (ch.kind === 'noCategory') {
    const spent = spentBetween(state, from, now, (c) => c === ch.category);
    if (spent > 0) return { status: 'failed', day, progress: 1, spent, target: 0, count: 0 };
    return { status: finished ? 'won' : 'active', day, progress: day / ch.days, spent: 0, target: 0, count: 0 };
  }
  if (ch.kind === 'lessThanLastWeek') {
    const target = spentBetween(state, from - ch.days * DAY, from);
    const spent = spentBetween(state, from, now);
    if (spent >= target && target > 0) return { status: 'failed', day, progress: 1, spent, target, count: 0 };
    return { status: finished ? 'won' : 'active', day, progress: target ? spent / target : 0, spent, target, count: 0 };
  }
  // noSpendDays: días completos (o el de hoy si ya acabó el reto) sin ningún gasto.
  const goal = 3;
  let count = 0;
  for (let d = from; d < now; d += DAY) {
    const dayEnd = d + DAY;
    if (dayEnd > today.getTime() && !finished) break; // hoy aún no ha terminado
    if (spentBetween(state, d, dayEnd) === 0) count++;
  }
  if (count >= goal) return { status: 'won', day, progress: 1, spent: 0, target: 0, count };
  // ¿Quedan días suficientes (incluido hoy) para llegar?
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const remaining = finished ? 0 : Math.max(0, Math.round((end - Math.max(todayStart, from)) / DAY));
  const status = count + remaining < goal ? 'failed' : 'active';
  return { status, day, progress: count / goal, spent: 0, target: 0, count };
}

/**
 * Racha: días seguidos (hasta ayer, y hoy si ya vas bien) sin pasarte de lo que
 * puedes gastar al día con tu presupuesto (presupuesto del mes ÷ días del mes).
 */
export function dailyStreak(state: ShareState & Pick<AppState, 'budgets'>, today: Date = new Date()): number {
  const budget = Object.values(state.budgets).reduce<number>((s, v) => s + (v ?? 0), 0);
  if (budget <= 0 || state.expenses.length === 0) return 0;
  const first = Math.min(...state.expenses.map((e) => new Date(e.date).getTime()));
  let streak = 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 366; i++) {
    const d = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - i);
    if (d.getTime() + DAY <= first) break;
    const ok = spentBetween(state, d.getTime(), d.getTime() + DAY) <= budget / daysInMonth(d);
    if (ok) streak++;
    // Si hoy ya te has pasado, la racha se cuenta hasta ayer; un día malo antes la corta.
    else if (i > 0) break;
  }
  return streak;
}
