import { homeOf, monthSummary, myShare, type ShareState } from './budget';
import { dailyStreak, evaluateChallenge } from './challenges';
import { normalizeMerchant } from './categorize';
import type { AppState, Cents, CategoryId } from './types';

/* ───────────── Cuánto te cuesta en horas de trabajo ───────────── */

/** Lo que ganas por hora a partir de tus ingresos al mes y tus horas a la semana. */
export function hourlyRate(income?: { monthly: Cents; hoursPerWeek: number }): number | null {
  if (!income || income.monthly <= 0 || income.hoursPerWeek <= 0) return null;
  return (income.monthly * 12) / (52 * income.hoursPerWeek);
}

/** Minutos de trabajo que cuesta un importe (redondeado a 5 min por encima de la hora). */
export function workMinutes(amount: Cents, rate: number | null): number | null {
  if (!rate || amount <= 0) return null;
  const min = (amount / rate) * 60;
  return min < 60 ? Math.max(1, Math.round(min)) : Math.round(min / 5) * 5;
}

/* ───────────── Gastos hormiga ───────────── */

export interface SmallHabit {
  /** Nombre del comercio (o la categoría si son varios comercios pequeños). */
  label: string;
  category: CategoryId;
  count: number;
  /** Lo que cuesta en 30 días. */
  monthly: Cents;
  average: Cents;
}

/**
 * Gastos pequeños y repetidos de los últimos 30 días (cafés, snacks, el bus…):
 * mismo comercio, como mucho 8 de tu moneda cada vez y al menos 6 veces.
 */
export function smallHabits(state: ShareState, today: Date = new Date(), max: Cents = 800, minCount = 6): SmallHabit[] {
  const home = homeOf(state);
  const from = today.getTime() - 30 * 86_400_000;
  const groups = new Map<string, { label: string; category: CategoryId; amounts: Cents[] }>();
  for (const e of state.expenses) {
    const t = new Date(e.date).getTime();
    if (t < from || t > today.getTime()) continue;
    const share = myShare(e, state.groups, home);
    if (share <= 0 || share > max) continue;
    const key = normalizeMerchant(e.merchant) || e.category;
    const g = groups.get(key) ?? { label: e.merchant, category: e.category, amounts: [] };
    g.amounts.push(share);
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.amounts.length >= minCount)
    .map((g) => {
      const monthly = g.amounts.reduce((a, b) => a + b, 0);
      return { label: g.label, category: g.category, count: g.amounts.length, monthly, average: Math.round(monthly / g.amounts.length) };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

/* ───────────── Lista de deseos (regla de las 48 horas) ───────────── */

export interface Wish {
  id: string;
  name: string;
  amount: Cents;
  createdAt: string;
  /** Lo decidiste: comprado o ya no lo quieres (ahorro). */
  outcome?: 'bought' | 'skipped';
  decidedAt?: string;
}

export const WISH_WAIT_HOURS = 48;

export function wishReadyAt(w: Wish): Date {
  return new Date(new Date(w.createdAt).getTime() + WISH_WAIT_HOURS * 3_600_000);
}

/** Lo que te has ahorrado diciendo que no a caprichos. */
export function impulseSavings(wishes: Wish[]): { total: Cents; count: number } {
  const skipped = wishes.filter((w) => w.outcome === 'skipped');
  return { total: skipped.reduce((s, w) => s + w.amount, 0), count: skipped.length };
}

/* ───────────── Mapa del mes ───────────── */

/** Gasto de cada día del mes (índice 0 = día 1) y el máximo, para pintar el calendario. */
export function monthHeatmap(state: ShareState, month: Date): { days: Cents[]; max: Cents; firstWeekday: number } {
  const home = homeOf(state);
  const y = month.getFullYear();
  const m = month.getMonth();
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, () => 0);
  for (const e of state.expenses) {
    const d = new Date(e.date);
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;
    days[d.getDate() - 1] += myShare(e, state.groups, home);
  }
  // Lunes = 0
  return { days, max: Math.max(0, ...days), firstWeekday: (new Date(y, m, 1).getDay() + 6) % 7 };
}

/** Escalón de color 0..4 (0 = nada) en una escala de un solo tono. */
export function heatLevel(value: Cents, max: Cents): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const r = value / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

/* ───────────── Logros ───────────── */

export type AchievementId =
  | 'first'
  | 'hundred'
  | 'weekUnder'
  | 'monthUnder'
  | 'streak7'
  | 'streak30'
  | 'challenge'
  | 'group'
  | 'goal'
  | 'impulse'
  | 'auto';

export const ACHIEVEMENTS: { id: AchievementId; emoji: string }[] = [
  { id: 'first', emoji: '🌱' },
  { id: 'auto', emoji: '⚡' },
  { id: 'weekUnder', emoji: '📆' },
  { id: 'streak7', emoji: '🔥' },
  { id: 'monthUnder', emoji: '🏆' },
  { id: 'streak30', emoji: '💎' },
  { id: 'challenge', emoji: '🎯' },
  { id: 'group', emoji: '👥' },
  { id: 'goal', emoji: '🐷' },
  { id: 'impulse', emoji: '🧘' },
  { id: 'hundred', emoji: '💯' },
];

/** Qué logros has conseguido (se calculan a partir de tus datos; no hay nada que guardar). */
export function achievements(state: AppState, today: Date = new Date()): Set<AchievementId> {
  const got = new Set<AchievementId>();
  const n = state.expenses.length;
  if (n >= 1) got.add('first');
  if (n >= 100) got.add('hundred');
  if (state.expenses.some((e) => e.source === 'applepay' || e.source === 'notificacion')) got.add('auto');
  const streak = dailyStreak(state, today);
  if (streak >= 7) {
    got.add('streak7');
    got.add('weekUnder');
  }
  if (streak >= 30) got.add('streak30');
  // Algún mes ya terminado (de los últimos 12) dentro del presupuesto.
  const budget = Object.values(state.budgets).reduce<number>((s, v) => s + (v ?? 0), 0);
  if (budget > 0) {
    for (let k = 1; k <= 12; k++) {
      const end = new Date(today.getFullYear(), today.getMonth() - k + 1, 0, 12);
      const hasData = state.expenses.some((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === end.getFullYear() && d.getMonth() === end.getMonth();
      });
      if (hasData && monthSummary(state, end).spent <= budget) {
        got.add('monthUnder');
        got.add('weekUnder');
        break;
      }
    }
  }
  if ((state.challenges ?? []).some((c) => evaluateChallenge(c, state, today).status === 'won')) got.add('challenge');
  if (state.groups.length > 0) got.add('group');
  if ((state.goals ?? []).some((g) => g.saved >= g.target)) got.add('goal');
  if ((state.wishes ?? []).some((w) => w.outcome === 'skipped')) got.add('impulse');
  return got;
}
