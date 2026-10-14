import type { Cents } from './types';

/** Lo que sueles gastar en un pago normal: el percentil 75 de tus últimos gastos (sin los raros). */
export function typicalExpense(amounts: Cents[]): Cents | null {
  const list = amounts.filter((a) => a > 0).sort((a, b) => a - b);
  if (list.length < 5) return null;
  return list[Math.min(list.length - 1, Math.floor(list.length * 0.75))];
}

/**
 * ¿Es un importe sospechosamente grande? (un cero de más, coma en mal sitio…).
 * Solo avisa, nunca impide guardar. `cap` es el tope absoluto ya en tu moneda.
 */
export function isUnusuallyLarge(amount: Cents, history: Cents[], cap: Cents): boolean {
  if (amount <= 0) return false;
  if (amount > cap) return true;
  const typical = typicalExpense(history);
  return typical !== null && amount > typical * 10;
}
