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

/** Lo necesario para el presupuesto: gastos, límites y, si lo usas, el sobrante por categoría. */
export type BudgetState = ShareState & Pick<AppState, 'budgets'> & Partial<Pick<AppState, 'rollover'>>;

/** Hasta cuántos meses atrás se mira para calcular el sobrante (más que suficiente y rápido). */
const ROLL_MONTHS = 24;

/**
 * Sobrante: lo que pasa a este mes desde los anteriores en cada categoría que lo
 * tiene activado. Cada mes ya terminado (desde el que lo activaste) suma lo que
 * te sobró o resta lo que te pasaste. Si te pasas mucho, como mucho se resta la
 * mitad del límite: un mal mes no te deja el siguiente a cero.
 * No se guarda ningún saldo: siempre se calcula con tus gastos.
 */
export function rolloverCarry(state: BudgetState, today: Date = new Date()): Partial<Record<CategoryId, Cents>> {
  const roll = state.rollover ?? {};
  const cats = (Object.keys(roll) as CategoryId[]).filter((c) => roll[c] && (state.budgets[c] ?? 0) > 0);
  if (cats.length === 0) return {};
  const current = monthKey(today);
  const wanted = new Set(cats);
  const home = homeOf(state);
  const spent = new Map<string, Cents>();
  for (const e of state.expenses) {
    if (!wanted.has(e.category)) continue;
    const m = monthKey(e.date);
    if (m >= current) continue;
    const k = `${m}|${e.category}`;
    spent.set(k, (spent.get(k) ?? 0) + myShare(e, state.groups, home));
  }
  const out: Partial<Record<CategoryId, Cents>> = {};
  for (const c of cats) {
    const budget = state.budgets[c] ?? 0;
    const since = roll[c]!;
    let carry = 0;
    for (let i = ROLL_MONTHS; i >= 1; i--) {
      const key = monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1));
      if (key < since) continue;
      carry = Math.max(-Math.floor(budget / 2), carry + budget - (spent.get(`${key}|${c}`) ?? 0));
    }
    out[c] = carry;
  }
  return out;
}

/** El límite de cada categoría este mes, ya con el sobrante de los anteriores. */
export function effectiveBudgets(state: BudgetState, today: Date = new Date()): Partial<Record<CategoryId, Cents>> {
  const carry = rolloverCarry(state, today);
  const out: Partial<Record<CategoryId, Cents>> = { ...state.budgets };
  for (const [c, v] of Object.entries(carry) as [CategoryId, Cents][]) out[c] = Math.max(0, (state.budgets[c] ?? 0) + v);
  return out;
}

export interface MonthSummary {
  /** Límite del mes, con el sobrante de meses anteriores si lo usas. */
  budget: Cents;
  /** Parte del límite que viene del sobrante (puede ser negativa si te pasaste). */
  carry: Cents;
  spent: Cents;
  remaining: Cents;
  /** Lo que puedes gastar cada día que queda del mes (incluido hoy) sin pasarte. */
  dailyAllowance: Cents;
  daysLeft: number;
  /** 0..1+ (puede pasar de 1 si te has pasado). */
  progress: number;
}

export function monthSummary(state: BudgetState, today: Date = new Date()): MonthSummary {
  const month = monthKey(today);
  const byCat = spentByCategory(state, month);
  const spent = Object.values(byCat).reduce((a, b) => a + b, 0);
  const base = totalBudget(state.budgets);
  const budget = totalBudget(effectiveBudgets(state, today));
  const remaining = budget - spent;
  const daysLeft = daysInMonth(today) - today.getDate() + 1;
  return {
    budget,
    carry: budget - base,
    spent,
    remaining,
    dailyAllowance: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    daysLeft,
    progress: budget > 0 ? spent / budget : 0,
  };
}

export interface CategoryStatus {
  category: CategoryId;
  /** Límite de este mes (con el sobrante, si está activado en la categoría). */
  budget: Cents;
  /** Lo que viene del sobrante de meses anteriores (0 si no está activado). */
  carry: Cents;
  spent: Cents;
  remaining: Cents;
  progress: number;
  level: 'ok' | 'warning' | 'over' | 'none';
}

export function categoryStatus(state: BudgetState, category: CategoryId, today: Date = new Date()): CategoryStatus {
  const spent = spentByCategory(state, monthKey(today))[category];
  const base = state.budgets[category] ?? 0;
  const carry = state.rollover?.[category] && base > 0 ? (rolloverCarry({ ...state, rollover: { [category]: state.rollover[category] } }, today)[category] ?? 0) : 0;
  const budget = Math.max(0, base + carry);
  const progress = budget > 0 ? spent / budget : 0;
  let level: CategoryStatus['level'] = 'none';
  if (budget > 0) level = progress > 1 ? 'over' : progress >= 0.8 ? 'warning' : 'ok';
  return { category, budget, carry: budget - base, spent, remaining: budget - spent, progress, level };
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
