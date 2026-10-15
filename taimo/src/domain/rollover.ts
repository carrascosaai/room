import { monthKey, rolloverCarry, type BudgetState } from './budget';
import { CATEGORIES } from './categories';
import type { AppState, CategoryId, Cents } from './types';

export interface RolloverRow {
  category: CategoryId;
  /** Límite mensual de la categoría (sin sobrante). */
  budget: Cents;
  on: boolean;
  /** Lo que pasa a este mes (puede ser negativo si te pasaste). */
  carry: Cents;
}

/** Las categorías con límite y si llevan sobrante, para la lista de «Sobrante y huchas». */
export function rolloverRows(state: BudgetState, today: Date = new Date()): RolloverRow[] {
  const carry = rolloverCarry(state, today);
  return CATEGORIES.filter((c) => (state.budgets[c.id] ?? 0) > 0).map((c) => ({
    category: c.id,
    budget: state.budgets[c.id] ?? 0,
    on: Boolean(state.rollover?.[c.id]),
    carry: carry[c.id] ?? 0,
  }));
}

/**
 * Activa o quita el sobrante de una categoría. Al activarlo cuenta desde este
 * mes: lo que te sobre a final de mes pasa al siguiente (nada cambia de golpe).
 */
export function withRollover(rollover: AppState['rollover'], category: CategoryId, on: boolean, today: Date = new Date()): AppState['rollover'] {
  const next = { ...(rollover ?? {}) };
  if (on) next[category] = next[category] ?? monthKey(today);
  else delete next[category];
  return Object.keys(next).length ? next : undefined;
}
