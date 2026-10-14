import type { Expense } from './types';

/** Días de datos que hay: desde el gasto más antiguo hasta hoy (0 si no hay ninguno). */
export function historyDays(expenses: Pick<Expense, 'date'>[], today: Date = new Date()): number {
  let oldest = Infinity;
  for (const e of expenses) {
    const t = new Date(e.date).getTime();
    if (Number.isFinite(t) && t < oldest) oldest = t;
  }
  if (!Number.isFinite(oldest)) return 0;
  return Math.max(0, Math.floor((today.getTime() - oldest) / 86_400_000));
}

/** Para proponer un presupuesto hace falta, al menos, un mes de gastos. */
export const MIN_DAYS_FOR_BUDGET = 28;
