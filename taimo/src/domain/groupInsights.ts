import { monthKey } from './budget';
import type { CategoryId, Cents, Expense, Group, Recurring } from './types';

const DAY = 86_400_000;

export interface GroupInsights {
  total: Cents;
  /** Lo que ha pagado (adelantado) cada miembro. */
  paidBy: Record<string, Cents>;
  /** Lo que le corresponde a cada miembro. */
  shareOf: Record<string, Cents>;
  byCategory: { category: CategoryId; total: Cents }[];
  /** Gasto por día (para viajes): fecha ISO (día) → total. */
  byDay: { day: string; total: Cents }[];
  /** Importe pagado en cada moneda original (viajes con varias monedas). */
  byCurrency: Record<string, Cents>;
}

export function groupInsights(group: Group, expenses: Expense[]): GroupInsights {
  const mine = expenses.filter((e) => e.groupId === group.id);
  const paidBy: Record<string, Cents> = {};
  const shareOf: Record<string, Cents> = {};
  const byCat = new Map<CategoryId, Cents>();
  const byDay = new Map<string, Cents>();
  const byCurrency: Record<string, Cents> = {};
  let total = 0;
  for (const e of mine) {
    total += e.amount;
    if (e.paidBy) paidBy[e.paidBy] = (paidBy[e.paidBy] ?? 0) + e.amount;
    for (const [m, v] of Object.entries(e.shares ?? {})) shareOf[m] = (shareOf[m] ?? 0) + v;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    const day = e.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + e.amount);
    const cur = e.original?.currency ?? group.currency ?? '';
    byCurrency[cur] = (byCurrency[cur] ?? 0) + (e.original?.amount ?? e.amount);
  }
  return {
    total,
    paidBy,
    shareOf,
    byCategory: [...byCat.entries()].map(([category, t]) => ({ category, total: t })).sort((a, b) => b.total - a.total),
    byDay: [...byDay.entries()].map(([day, t]) => ({ day, total: t })).sort((a, b) => a.day.localeCompare(b.day)),
    byCurrency,
  };
}

export interface BudgetPlan {
  budget: Cents;
  spent: Cents;
  remaining: Cents;
  /** Días que quedan (viaje: hasta la vuelta; piso/pareja: hasta fin de mes). */
  daysLeft: number;
  /** Cuánto podéis gastar al día entre todos, y por persona. */
  perDay: Cents;
  perPersonPerDay: Cents;
}

/**
 * Presupuesto del grupo. En un viaje es el total del viaje; en pareja y piso,
 * el del mes en curso (solo cuentan los gastos de este mes).
 */
export function groupBudgetPlan(group: Group, expenses: Expense[], today = new Date()): BudgetPlan | null {
  if (!group.budget) return null;
  const mine = expenses.filter((e) => e.groupId === group.id);
  let spent: number;
  let daysLeft: number;
  if (group.kind === 'trip') {
    spent = mine.reduce((s, e) => s + e.amount, 0);
    const end = group.trip?.end ? new Date(`${group.trip.end}T23:59:59`) : null;
    const start = group.trip?.start ? new Date(`${group.trip.start}T00:00:00`) : null;
    const from = start && start > today ? start : today;
    daysLeft = end ? Math.max(1, Math.ceil((end.getTime() - from.getTime()) / DAY)) : 1;
    // Fecha mal guardada (de versiones antiguas): como si no hubiera fecha de fin.
    if (!Number.isFinite(daysLeft)) daysLeft = 1;
  } else {
    const key = monthKey(today);
    spent = mine.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0);
    daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
  }
  const remaining = group.budget - spent;
  const perDay = remaining > 0 ? Math.floor(remaining / daysLeft) : 0;
  const people = Math.max(1, group.members.length);
  return { budget: group.budget, spent, remaining, daysLeft, perDay, perPersonPerDay: Math.floor(perDay / people) };
}

/** Días de viaje (incluidos ida y vuelta), o null si no hay fechas. */
export function tripDays(group: Group): number | null {
  if (!group.trip?.start || !group.trip?.end) return null;
  const days = Math.round((new Date(group.trip.end).getTime() - new Date(group.trip.start).getTime()) / DAY) + 1;
  return Number.isFinite(days) ? days : null;
}

/** Id fijo por gasto fijo y mes: así dos móviles no crean el mismo gasto dos veces. */
export function recurringExpenseId(r: Recurring, month: string): string {
  return `fijo-${r.id}-${month}`;
}

/**
 * Gastos fijos que tocan este mes y aún no existen (el día ya ha llegado).
 * El reparto se hace igual que el resto: pesos del grupo o a partes iguales.
 */
export function dueRecurring(
  group: Group,
  expenses: Expense[],
  today: Date,
  split: (amount: Cents) => Record<string, Cents>,
): Expense[] {
  const month = monthKey(today);
  // Los que ya existen y los que se borraron a mano (no se vuelven a crear).
  const existing = new Set([...expenses.map((e) => e.id), ...(group.recurringSkipped ?? [])]);
  const out: Expense[] = [];
  for (const r of group.recurring ?? []) {
    if (today.getDate() < r.day) continue;
    const id = recurringExpenseId(r, month);
    if (existing.has(id)) continue;
    const date = new Date(today.getFullYear(), today.getMonth(), r.day, 9, 0).toISOString();
    out.push({
      id,
      amount: r.amount,
      merchant: r.name,
      category: r.category,
      date,
      source: 'fijo',
      groupId: group.id,
      paidBy: r.paidBy,
      shares: split(r.amount),
      splitMode: group.weights ? 'weights' : 'equal',
      weights: group.weights,
    });
  }
  return out;
}

/** Si `id` es el de un gasto fijo mensual creado solo (`fijo-<r>-<YYYY-MM>`). */
export function isRecurringInstanceId(id: string): boolean {
  return /^fijo-.+-\d{4}-\d{2}$/.test(id);
}

/** Máximo de borrados de fijos que se recuerdan por grupo (viaja en los ajustes del grupo). */
export const MAX_RECURRING_SKIPPED = 200;

/** Añade `id` a los fijos saltados del grupo (sin repetir y con tope). */
export function withRecurringSkipped(group: Group, id: string): string[] {
  const list = group.recurringSkipped ?? [];
  return list.includes(id) ? list : [...list, id].slice(-MAX_RECURRING_SKIPPED);
}
