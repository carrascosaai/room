import type { Expense } from './types';

/** Solo se proponen para revisar los gastos automáticos de los últimos días (los viejos ya no se recuerdan bien). */
export const REVIEW_DAYS = 30;

/** Si el gasto lo apuntó Taimo solo (Apple Pay o un aviso de pago del banco). */
export function isAutomatic(e: Expense): boolean {
  return e.source === 'applepay' || e.source === 'notificacion';
}

/**
 * Gastos apuntados solos que aún no has mirado: uno a uno, el más reciente primero.
 * Los que ya están en un grupo cuentan como mirados (los moviste tú).
 */
export function reviewQueue(expenses: Expense[], today: Date = new Date(), days = REVIEW_DAYS): Expense[] {
  const since = today.getTime() - days * 86_400_000;
  return expenses
    .filter((e) => isAutomatic(e) && !e.reviewed && !e.groupId && new Date(e.date).getTime() >= since)
    .sort((a, b) => b.date.localeCompare(a.date));
}
