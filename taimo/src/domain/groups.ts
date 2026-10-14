import type { Cents, Expense, Group, ReceiptItem, Settlement } from './types';

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

/**
 * Reparte según pesos (pareja 60/40, una familia con 2 adultos que cuenta doble…).
 * Usa el método del mayor resto para que la suma sea exacta.
 */
export function splitByWeights(amount: Cents, weights: Record<string, number>): Record<string, Cents> {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const totalW = entries.reduce((s, [, w]) => s + w, 0);
  if (totalW === 0) return {};
  const raw = entries.map(([id, w]) => ({ id, exact: (amount * w) / totalW }));
  const shares: Record<string, Cents> = {};
  let assigned = 0;
  for (const r of raw) {
    shares[r.id] = Math.floor(r.exact);
    assigned += shares[r.id];
  }
  const order = [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; assigned < amount; i++, assigned++) shares[order[i % order.length].id] += 1;
  return shares;
}

/** Para importes exactos por persona: cuánto falta (o sobra) para cuadrar con el total. */
export function exactRemainder(amount: Cents, shares: Record<string, Cents>): Cents {
  return amount - Object.values(shares).reduce((s, v) => s + v, 0);
}

/**
 * A quién le toca pagar lo próximo: el que más debe (o el que menos ha puesto).
 * Útil en parejas y pisos para ir equilibrando sin hacer transferencias.
 */
export function nextPayer(balance: Record<string, Cents>): string | null {
  const entries = Object.entries(balance);
  if (entries.length < 2) return null;
  const [id, value] = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
  return value < 0 ? id : null;
}

/**
 * Reparto por productos del ticket: cada línea se divide entre quienes la
 * comparten y lo que no está en ninguna línea (propina, impuestos, pan…) se
 * reparte en proporción a lo que ha consumido cada uno. Devuelve null si los
 * productos suman más que el total o no hay nadie asignado.
 */
export function splitByItems(total: Cents, items: ReceiptItem[]): Record<string, Cents> | null {
  const base: Record<string, Cents> = {};
  let itemsTotal = 0;
  for (const it of items) {
    if (it.amount <= 0 || it.who.length === 0) continue;
    itemsTotal += it.amount;
    for (const [id, v] of Object.entries(splitEqually(it.amount, it.who))) base[id] = (base[id] ?? 0) + v;
  }
  if (itemsTotal === 0 || itemsTotal > total) return null;
  const rest = total - itemsTotal;
  const extra = rest > 0 ? splitByWeights(rest, base) : {};
  return Object.fromEntries(Object.entries(base).map(([id, v]) => [id, v + (extra[id] ?? 0)]));
}

/**
 * El bote común se comporta como un miembro más: lo que alguien pone en el bote
 * es un pago de esa persona al bote, y un gasto pagado con el bote lo «paga» él.
 * Así los saldos siguen siendo justos aunque cada uno ponga cantidades distintas,
 * y lo que sobre se devuelve («Bote → Ana»).
 */
export const POT = '__pot__';

/** Dinero que queda en el bote. */
export function potLeft(balance: Record<string, Cents>): Cents {
  return -(balance[POT] ?? 0);
}

/** Lo que ha puesto cada uno en el bote (menos lo que se le ha devuelto). */
export function potContributions(group: Group, settlements: Settlement[]): Record<string, Cents> {
  const out: Record<string, Cents> = {};
  for (const s of settlements) {
    if (s.groupId !== group.id) continue;
    if (s.to === POT) out[s.from] = (out[s.from] ?? 0) + s.amount;
    if (s.from === POT) out[s.to] = (out[s.to] ?? 0) - s.amount;
  }
  return out;
}

/** Los saldos sin el bote (para decidir a quién le toca pagar). */
export function withoutPot(balance: Record<string, Cents>): Record<string, Cents> {
  const { [POT]: _pot, ...rest } = balance;
  return rest;
}

/**
 * Pareja: reparto según lo que gana cada uno, en porcentajes enteros que suman 100
 * (1.800 € y 1.200 € → 60 / 40). Null si falta algún sueldo.
 */
export function incomeWeights(incomes: Record<string, Cents>): Record<string, number> | null {
  const values = Object.values(incomes);
  if (values.length < 2 || values.some((v) => !(v > 0))) return null;
  return splitByWeights(100, incomes);
}

/** Lo «nuestro» de un mes: total compartido del grupo y la parte de cada uno. */
export function sharedMonth(group: Group, expenses: Expense[], month: string): { total: Cents; shares: Record<string, Cents> } {
  const shares: Record<string, Cents> = Object.fromEntries(group.members.map((m) => [m.id, 0]));
  let total = 0;
  for (const e of expenses) {
    if (e.groupId !== group.id || !e.shares) continue;
    const d = new Date(e.date);
    if (`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` !== month) continue;
    total += e.amount;
    for (const [id, s] of Object.entries(e.shares)) shares[id] = (shares[id] ?? 0) + s;
  }
  return { total, shares };
}
