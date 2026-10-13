import { convert, FALLBACK, type Rates } from '../fx/fx';

import { CATEGORIES } from './categories';
import type { AppState, CategoryId, Cents, Expense, Group } from './types';

/** Lo necesario para calcular "lo mío": grupos y, si los hay, tu moneda y tipos de cambio. */
export type ShareState = Pick<AppState, 'expenses' | 'groups'> & Partial<Pick<AppState, 'profile' | 'fx'>>;

/** Para pasar a tu moneda los gastos de grupos que llevan las cuentas en otra. */
export interface HomeCurrency {
  home?: string;
  fx?: Rates;
}

export function homeOf(state: Partial<Pick<AppState, 'profile' | 'fx'>>): HomeCurrency {
  return { home: state.profile?.currency, fx: state.fx };
}

/** Mes en formato "2026-10". */
export function monthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function meIn(group: Group | undefined): string | undefined {
  return group?.members.find((m) => m.isMe)?.id;
}

/**
 * Lo que este gasto me cuesta a MÍ. Un gasto personal cuenta entero; uno
 * compartido solo cuenta mi parte, haya pagado yo o no. Así, si pago 100 € de
 * la compra del piso y me deben 50 €, mi presupuesto refleja 50 €, no 100 €.
 */
export function myShare(expense: Expense, groups: Group[], home: HomeCurrency = {}): Cents {
  if (!expense.groupId) return expense.amount;
  const group = groups.find((g) => g.id === expense.groupId);
  const me = meIn(group);
  if (!me || !expense.shares) return 0;
  const share = expense.shares[me] ?? 0;
  // Si el grupo lleva las cuentas en otra moneda, tu parte se pasa a la tuya.
  if (group?.currency && home.home && group.currency !== home.home) {
    return convert(share, group.currency, home.home, home.fx ?? FALLBACK) ?? share;
  }
  return share;
}

export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => monthKey(e.date) === month);
}

export function spentByCategory(state: ShareState, month: string): Record<CategoryId, Cents> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, Cents>;
  const home = homeOf(state);
  for (const e of expensesInMonth(state.expenses, month)) {
    totals[e.category] += myShare(e, state.groups, home);
  }
  return totals;
}

export function totalBudget(budgets: AppState['budgets']): Cents {
  return Object.values(budgets).reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

export interface MonthSummary {
  budget: Cents;
  spent: Cents;
  remaining: Cents;
  /** Lo que puedes gastar cada día que queda del mes (incluido hoy) sin pasarte. */
  dailyAllowance: Cents;
  daysLeft: number;
  /** 0..1+ (puede pasar de 1 si te has pasado). */
  progress: number;
}

export function monthSummary(
  state: ShareState & Pick<AppState, 'budgets'>,
  today: Date = new Date(),
): MonthSummary {
  const month = monthKey(today);
  const byCat = spentByCategory(state, month);
  const spent = Object.values(byCat).reduce((a, b) => a + b, 0);
  const budget = totalBudget(state.budgets);
  const remaining = budget - spent;
  const daysLeft = daysInMonth(today) - today.getDate() + 1;
  return {
    budget,
    spent,
    remaining,
    dailyAllowance: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    daysLeft,
    progress: budget > 0 ? spent / budget : 0,
  };
}

export interface CategoryStatus {
  category: CategoryId;
  budget: Cents;
  spent: Cents;
  remaining: Cents;
  progress: number;
  level: 'ok' | 'warning' | 'over' | 'none';
}

export function categoryStatus(
  state: ShareState & Pick<AppState, 'budgets'>,
  category: CategoryId,
  today: Date = new Date(),
): CategoryStatus {
  const spent = spentByCategory(state, monthKey(today))[category];
  const budget = state.budgets[category] ?? 0;
  const progress = budget > 0 ? spent / budget : 0;
  let level: CategoryStatus['level'] = 'none';
  if (budget > 0) level = progress > 1 ? 'over' : progress >= 0.8 ? 'warning' : 'ok';
  return { category, budget, spent, remaining: budget - spent, progress, level };
}

/** Gasto mío por día del mes (índice 0 = día 1). */
export function dailySpending(state: ShareState, month: Date): Cents[] {
  const days = new Array(daysInMonth(month)).fill(0);
  const key = monthKey(month);
  const home = homeOf(state);
  for (const e of expensesInMonth(state.expenses, key)) {
    days[new Date(e.date).getDate() - 1] += myShare(e, state.groups, home);
  }
  return days;
}

/** Total mío de los últimos `count` meses, del más antiguo al actual. */
export function monthlyTotals(
  state: ShareState,
  today: Date,
  count: number,
): { month: string; total: Cents }[] {
  const result: { month: string; total: Cents }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = monthKey(d);
    const total = expensesInMonth(state.expenses, key).reduce((s, e) => s + myShare(e, state.groups, homeOf(state)), 0);
    result.push({ month: key, total });
  }
  return result;
}
