import type { Cents, Expense, Group, Settlement } from './types';

/**
 * Reparte `amount` a partes iguales entre `memberIds`. Los céntimos sobrantes se
 * dan a los primeros miembros para que la suma sea exacta (10 € / 3 = 3,34 + 3,33 + 3,33).
 */
export function splitEqually(amount: Cents, memberIds: string[]): Record<string, Cents> {
  if (memberIds.length === 0) return {};
  const base = Math.floor(amount / memberIds.length);
  let remainder = amount - base * memberIds.length;
  const shares: Record<string, Cents> = {};
  for (const id of memberIds) {
    shares[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return shares;
}

/**
 * Saldo de cada miembro del grupo: positivo = le deben, negativo = debe.
 * Tiene en cuenta los gastos y los pagos ya hechos para saldar.
 */
export function balances(
  group: Group,
  expenses: Expense[],
  settlements: Settlement[],
): Record<string, Cents> {
  const result: Record<string, Cents> = Object.fromEntries(group.members.map((m) => [m.id, 0]));
  for (const e of expenses) {
    if (e.groupId !== group.id || !e.paidBy || !e.shares) continue;
    result[e.paidBy] = (result[e.paidBy] ?? 0) + e.amount;
    for (const [memberId, share] of Object.entries(e.shares)) {
      result[memberId] = (result[memberId] ?? 0) - share;
    }
  }
  for (const s of settlements) {
    if (s.groupId !== group.id) continue;
    result[s.from] = (result[s.from] ?? 0) + s.amount;
    result[s.to] = (result[s.to] ?? 0) - s.amount;
  }
  return result;
}

export interface Transfer {
  from: string;
  to: string;
  amount: Cents;
}

/**
 * Propone el mínimo número razonable de pagos para dejar todo a cero
 * (algoritmo voraz: el que más debe paga al que más le deben).
 */
export function suggestTransfers(balance: Record<string, Cents>): Transfer[] {
  const debtors = Object.entries(balance)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balance)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}

export function memberName(group: Group, memberId: string): string {
  const m = group.members.find((x) => x.id === memberId);
  if (!m) return '¿?';
  return m.isMe ? 'Tú' : m.name;
}
