import { daysInMonth, homeOf, monthKey, monthSummary, myShare } from './budget';
import { recurringExpenseId } from './groupInsights';
import { splitByWeights, splitEqually } from './groups';
import { detectSubscriptions, nextCharge } from './insights';
import type { AppState, CategoryId, Cents, Expense, Group, Recurring } from './types';

const DAY = 86_400_000;

/** Un recibo que va a llegar: una suscripción detectada o un gasto fijo de un grupo (tu parte). */
export interface UpcomingCharge {
  id: string;
  name: string;
  /** Lo que te toca a ti (en tu moneda). */
  amount: Cents;
  /** ISO */
  date: string;
  category: CategoryId;
  kind: 'subscription' | 'group';
  /** Nombre del grupo (solo gastos fijos de grupo). */
  group?: string;
}

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function addMonths(d: Date, months: number, day: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, daysInMonth(first)), 10);
}

/** Tu parte de un gasto fijo del grupo, repartido como lo reparte la app (pesos o a partes iguales). */
function myRecurringShare(group: Group, r: Recurring, state: Pick<AppState, 'groups'> & Partial<Pick<AppState, 'profile' | 'fx'>>): Cents {
  const ids = group.members.map((m) => m.id);
  const shares = group.weights
    ? splitByWeights(r.amount, Object.fromEntries(ids.map((id) => [id, group.weights![id] ?? 1])))
    : splitEqually(r.amount, ids);
  const fake: Expense = { id: r.id, amount: r.amount, merchant: r.name, category: r.category, date: '', source: 'fijo', groupId: group.id, shares };
  return myShare(fake, state.groups, homeOf(state));
}

/**
 * Recibos de los próximos `days` días (hoy incluido): suscripciones detectadas en
 * tus gastos y gastos fijos de tus grupos que aún no se han apuntado. Ordenados por fecha.
 */
export function upcomingCharges(
  state: Pick<AppState, 'expenses' | 'groups'> & Partial<Pick<AppState, 'profile' | 'fx'>>,
  today: Date = new Date(),
  days = 30,
): UpcomingCharge[] {
  const from = startOf(today).getTime();
  const to = from + (days + 1) * DAY;
  const inRange = (d: Date) => d.getTime() >= from && d.getTime() < to;
  const out: UpcomingCharge[] = [];

  for (const sub of detectSubscriptions(state.expenses, today)) {
    const first = nextCharge(sub, today);
    const day = new Date(sub.lastDate).getDate();
    for (let i = 0, d = first; i < 3 && d.getTime() < to; i++, d = addMonths(first, i, day)) {
      if (!inRange(d)) continue;
      out.push({ id: `sub-${sub.merchant}-${monthKey(d)}`, name: sub.merchant, amount: sub.monthly, date: d.toISOString(), category: sub.category, kind: 'subscription' });
    }
  }

  const known = new Set(state.expenses.map((e) => e.id));
  for (const g of state.groups) {
    if (!g.recurring?.length || !g.members.some((m) => m.isMe)) continue;
    const skipped = new Set(g.recurringSkipped ?? []);
    for (const r of g.recurring) {
      const amount = myRecurringShare(g, r, state);
      if (amount <= 0) continue;
      for (let i = 0; i < 2; i++) {
        const d = addMonths(today, i, r.day);
        const id = recurringExpenseId(r, monthKey(d));
        // Ya apuntado (o borrado a mano) este mes: no vuelve a llegar.
        if (known.has(id) || skipped.has(id) || !inRange(d)) continue;
        out.push({ id, name: r.name, amount, date: d.toISOString(), category: r.category, kind: 'group', group: g.name });
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}

/** Total de los recibos de los próximos `days` días. */
export function chargesWithin(charges: UpcomingCharge[], today: Date, days: number): { total: Cents; count: number } {
  const to = startOf(today).getTime() + (days + 1) * DAY;
  const soon = charges.filter((c) => new Date(c.date).getTime() < to);
  return { total: soon.reduce((s, c) => s + c.amount, 0), count: soon.length };
}

/**
 * Lo que te quedará del presupuesto del mes después de pagar los recibos que
 * llegan antes de fin de mes. null si no tienes presupuesto.
 */
export function leftAfterCharges(
  state: Pick<AppState, 'expenses' | 'groups' | 'budgets'> & Partial<Pick<AppState, 'profile' | 'fx'>>,
  charges: UpcomingCharge[],
  today: Date = new Date(),
): Cents | null {
  const s = monthSummary(state, today);
  if (s.budget <= 0) return null;
  const month = monthKey(today);
  return s.remaining - charges.filter((c) => monthKey(c.date) === month).reduce((sum, c) => sum + c.amount, 0);
}
