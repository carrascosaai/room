import { FALLBACK, rateBetween, type Rates } from '../fx/fx';

import { splitByWeights } from './groups';
import type { AppState, Cents, Expense, Group, OriginalAmount, Recurring } from './types';

/**
 * Reescala unas partes a un nuevo total manteniendo la proporción y con suma exacta
 * (mayor resto). Los miembros con parte 0 se conservan con 0.
 */
export function rescaleShares(shares: Record<string, Cents>, total: Cents): Record<string, Cents> {
  const scaled = splitByWeights(total, shares);
  return Object.fromEntries(Object.keys(shares).map((id) => [id, scaled[id] ?? 0]));
}

/** Parte proporcional de un importe (redondeada). */
const part = (amount: Cents, share: Cents, total: Cents) => (total ? Math.round((amount * share) / total) : 0);

/**
 * Pasa un gasto de la moneda `from` a `to` (`rate` = unidades de `to` por 1 de `from`).
 * El gasto se pagó en realidad en `from` (o en su moneda original), así que se guarda
 * en `original` para que se pueda seguir editando en esa moneda. Las líneas del ticket
 * van en la moneda en que se pagó, así que no cambian.
 */
export function convertExpense(e: Expense, from: string, to: string, rate: number, updatedAt: string): Expense {
  let amount: Cents;
  let original: OriginalAmount | undefined;
  if (e.original) {
    if (e.original.currency === to) {
      amount = e.original.amount;
      original = undefined;
    } else {
      const r = e.original.rate * rate;
      amount = Math.round(e.original.amount * r);
      original = { ...e.original, rate: r };
    }
  } else {
    amount = Math.round(e.amount * rate);
    original = { amount: e.amount, currency: from, rate };
  }
  let shares = e.shares;
  if (shares) {
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    shares = rescaleShares(shares, sum === e.amount ? amount : Math.round(sum * rate));
  }
  const { original: _o, ...rest } = e;
  return { ...rest, amount, ...(shares ? { shares } : {}), ...(original ? { original } : {}), updatedAt };
}

/**
 * Cambia la moneda de un grupo convirtiendo todo lo apuntado: gastos (y sus partes),
 * pagos entre miembros, gastos fijos y presupuesto. Los campos que vengan en `changes`
 * (salvo un presupuesto sin tocar) se toman tal cual, porque ya están en la nueva moneda.
 * Devuelve null si no hay tipo de cambio entre las dos monedas.
 */
export function changeGroupCurrency(
  state: AppState,
  group: Group,
  from: string,
  to: string,
  changes: Partial<Group>,
  now: string = new Date().toISOString(),
): AppState | null {
  const rate = rateBetween(from, to, state.fx ?? FALLBACK);
  if (rate === null || !(rate > 0)) return null;
  const conv = (v: Cents) => Math.round(v * rate);

  const budgetUntouched = !('budget' in changes) || changes.budget === group.budget;
  const budget = budgetUntouched ? (group.budget !== undefined ? conv(group.budget) : undefined) : changes.budget;
  const recurring: Recurring[] | undefined =
    'recurring' in changes ? changes.recurring : group.recurring?.map((r) => ({ ...r, amount: conv(r.amount) }));

  const nextGroup: Group = { ...group, ...changes, currency: to, budget, recurring, updatedAt: now };
  if (nextGroup.budget === undefined) delete nextGroup.budget;
  if (nextGroup.recurring === undefined) delete nextGroup.recurring;

  return {
    ...state,
    groups: state.groups.map((g) => (g.id === group.id ? nextGroup : g)),
    expenses: state.expenses.map((e) => (e.groupId === group.id ? convertExpense(e, from, to, rate, now) : e)),
    settlements: state.settlements.map((s) => (s.groupId === group.id ? { ...s, amount: conv(s.amount), updatedAt: now } : s)),
  };
}

/**
 * Al borrar un grupo: lo que me tocaba de un gasto pasa a ser un gasto personal en mi
 * moneda. Devuelve null si no me tocaba nada (o no sé quién soy en el grupo).
 */
export function groupExpenseToPersonal(e: Expense, group: Group, home: string, fx?: Rates): Expense | null {
  const me = group.members.find((m) => m.isMe)?.id;
  const share = me ? e.shares?.[me] ?? 0 : 0;
  if (share <= 0) return null;
  const gc = group.currency || home;
  const rate = gc === home ? 1 : rateBetween(gc, home, fx ?? FALLBACK);
  let amount: Cents = rate === null ? share : Math.round(share * rate);
  let original: OriginalAmount | undefined;
  if (e.original) {
    // Mi parte en la moneda en que se pagó.
    const origPart = part(e.original.amount, share, e.amount);
    if (e.original.currency === home) amount = origPart;
    else if (rate !== null) original = { amount: origPart, currency: e.original.currency, rate: e.original.rate * rate };
  } else if (gc !== home && rate !== null) {
    original = { amount: share, currency: gc, rate };
  }
  const { groupId: _g, paidBy: _p, shares: _s, splitMode: _m, weights: _w, items: _i, original: _o, ...rest } = e;
  return { ...rest, amount, ...(original ? { original } : {}) };
}
