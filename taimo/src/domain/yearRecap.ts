import { effectiveBudgets, homeOf, myShare, totalBudget, type BudgetState } from './budget';
import { normalizeMerchant } from './categorize';
import { activeDays, activityStreak } from './challenges';
import type { AppState, Cents, CategoryId } from './types';

/** Lo necesario para «Tu año en Taimo». */
export type YearState = BudgetState & Partial<Pick<AppState, 'moneyBack' | 'checkins'>>;

export interface YearRecap {
  year: number;
  /** El año aún no ha terminado. */
  partial: boolean;
  spent: Cents;
  count: number;
  top: { category: CategoryId; total: Cents } | null;
  merchant: { name: string; total: Cents; count: number } | null;
  /** Tu mejor mes ya terminado: el que más te sobró del presupuesto (o, sin presupuesto, el que menos gastaste). */
  bestMonth: { month: Date; spent: Cents; under: Cents | null } | null;
  /** Lo recuperado con «Dinero que es tuyo» ese año. */
  recovered: Cents;
  /** Días en que apuntaste algo. */
  days: number;
  /** Tu racha más larga del año. */
  bestStreak: number;
  /** Mesas de «Paga tu parte» que abriste. */
  tables: number;
}

/** El resumen de un año (o del que va), para verlo en tarjetas y compartirlo. */
export function yearRecap(state: YearState, year: number, now: Date = new Date()): YearRecap {
  const home = homeOf(state);
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const prefix = String(year);
  const inYear = state.expenses.filter((e) => {
    const t = new Date(e.date);
    return t >= start && t < end;
  });

  let spent = 0;
  let count = 0;
  const byCat = new Map<CategoryId, Cents>();
  const byMerchant = new Map<string, { name: string; total: Cents; count: number }>();
  const byMonth = new Map<number, { spent: Cents; count: number }>();
  for (const e of inYear) {
    const share = myShare(e, state.groups, home);
    if (share <= 0) continue;
    spent += share;
    count++;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + share);
    const key = normalizeMerchant(e.merchant);
    if (key) {
      const m = byMerchant.get(key) ?? { name: e.merchant, total: 0, count: 0 };
      byMerchant.set(key, { name: m.name, total: m.total + share, count: m.count + 1 });
    }
    const month = new Date(e.date).getMonth();
    const bm = byMonth.get(month) ?? { spent: 0, count: 0 };
    byMonth.set(month, { spent: bm.spent + share, count: bm.count + 1 });
  }

  const topEntry = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  // El comercio donde más vuelves: más veces y, a igualdad, más dinero.
  const merchant = [...byMerchant.values()].sort((a, b) => b.count - a.count || b.total - a.total)[0] ?? null;

  // Mejor mes: solo meses ya terminados y con datos de verdad (un mes con 1 gasto no compite).
  const finished = [...byMonth.entries()].filter(([m]) => new Date(year, m + 1, 1) <= now);
  const enough = finished.some(([, v]) => v.count >= 5) ? finished.filter(([, v]) => v.count >= 5) : finished;
  let bestMonth: YearRecap['bestMonth'] = null;
  for (const [m, v] of enough) {
    const month = new Date(year, m, 1);
    const budget = totalBudget(effectiveBudgets(state, month));
    const under = budget > 0 ? budget - v.spent : null;
    const better =
      !bestMonth ||
      (under !== null && bestMonth.under !== null ? under > bestMonth.under : v.spent < bestMonth.spent);
    if (better) bestMonth = { month, spent: v.spent, under };
  }

  const recovered = (state.moneyBack?.recovered ?? []).filter((r) => r.date.startsWith(prefix)).reduce((s, r) => s + r.amount, 0);
  const yearState = { expenses: inYear, checkins: (state.checkins ?? []).filter((d) => d.startsWith(prefix)) };
  const days = [...activeDays(yearState)].filter((d) => d.startsWith(prefix)).length;
  const bestStreak = activityStreak(yearState, now < end ? now : end).best;
  const tables = state.groups.filter((g) => g.table && (g.table.d ?? g.createdAt ?? '').startsWith(prefix)).length;

  return {
    year,
    partial: now < end,
    spent,
    count,
    top: topEntry ? { category: topEntry[0], total: topEntry[1] } : null,
    merchant,
    bestMonth,
    recovered,
    days,
    bestStreak,
    tables,
  };
}

/** Qué año enseñar por defecto: el actual, salvo en enero (entonces, el que acaba de terminar). */
export function defaultRecapYear(now: Date = new Date()): number {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

/** «Tu año» se propone solo en diciembre y enero (desde Más se puede ver siempre). */
export function isRecapSeason(now: Date = new Date()): boolean {
  return now.getMonth() === 11 || now.getMonth() === 0;
}
