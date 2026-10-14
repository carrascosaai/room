import { homeOf, myShare, type ShareState } from './budget';
import { CATEGORIES } from './categories';
import type { CategoryId, Cents, Expense } from './types';

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

export interface Range {
  start: Date;
  /** Exclusivo. */
  end: Date;
}

/** Lunes de la semana de `d` (semana europea). */
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - dow);
  return x;
}

export function rangeOf(period: Exclude<Period, 'all'>, anchor: Date): Range {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  switch (period) {
    case 'day': {
      const start = new Date(y, m, anchor.getDate());
      return { start, end: new Date(y, m, anchor.getDate() + 1) };
    }
    case 'week': {
      const start = startOfWeek(anchor);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case 'month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'year':
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
}

/** Mueve la fecha de referencia `steps` periodos (negativo = hacia atrás). */
export function shiftAnchor(period: Period, anchor: Date, steps: number): Date {
  const d = new Date(anchor);
  if (period === 'day') d.setDate(d.getDate() + steps);
  else if (period === 'week') d.setDate(d.getDate() + 7 * steps);
  else if (period === 'month') return new Date(d.getFullYear(), d.getMonth() + steps, 1);
  else if (period === 'year') return new Date(d.getFullYear() + steps, 0, 1);
  return d;
}

export interface Bucket {
  /** Inicio del tramo: hora, día, mes o año. */
  start: Date;
  /** Qué representa: para etiquetar en el idioma del usuario. */
  kind: 'hour' | 'weekday' | 'monthday' | 'month' | 'year';
  total: Cents;
}

export interface PeriodStats {
  range: Range;
  total: Cents;
  /** Mismo periodo justo anterior (null en "todo"). */
  previousTotal: Cents | null;
  /** El periodo está en curso y la comparación es con el mismo punto del anterior. */
  partial: boolean;
  previousRange: Range | null;
  buckets: Bucket[];
  byCategory: { category: CategoryId; total: Cents }[];
  biggest: Expense[];
  /** Días transcurridos del periodo (para la media). */
  days: number;
  months: number;
}

function inRange(e: Expense, r: Range): boolean {
  const t = new Date(e.date).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
}

function sum(expenses: Expense[], state: ShareState): Cents {
  return expenses.reduce((s, e) => s + myShare(e, state.groups, homeOf(state)), 0);
}

const DAY = 86_400_000;

export function periodStats(
  state: ShareState,
  period: Period,
  anchor: Date,
  now: Date = new Date(),
): PeriodStats {
  const home = homeOf(state);
  const mine = state.expenses.filter((e) => myShare(e, state.groups, home) > 0);

  let range: Range;
  let previous: Range | null = null;
  if (period === 'all') {
    const first = mine.reduce<Date>((min, e) => (new Date(e.date) < min ? new Date(e.date) : min), now);
    range = { start: new Date(first.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  } else {
    range = rangeOf(period, anchor);
    previous = rangeOf(period, shiftAnchor(period, anchor, -1));
  }
  // Periodo en curso: se compara con el mismo tramo del anterior (del 1 al 14 contra del 1 al 14).
  const partial = previous !== null && now >= range.start && now < range.end;
  if (partial && previous) {
    const elapsed = now.getTime() - range.start.getTime();
    previous = { start: previous.start, end: new Date(Math.min(previous.end.getTime(), previous.start.getTime() + elapsed)) };
  }

  const current = mine.filter((e) => inRange(e, range));
  const total = sum(current, state);

  // Tramos de la gráfica
  const buckets: Bucket[] = [];
  const add = (start: Date, end: Date, kind: Bucket['kind']) =>
    buckets.push({ start, kind, total: sum(current.filter((e) => inRange(e, { start, end })), state) });
  const s = range.start;
  if (period === 'day') {
    for (let h = 0; h < 24; h++) add(new Date(s.getFullYear(), s.getMonth(), s.getDate(), h), new Date(s.getFullYear(), s.getMonth(), s.getDate(), h + 1), 'hour');
  } else if (period === 'week' || period === 'month') {
    const n = Math.round((range.end.getTime() - s.getTime()) / DAY);
    for (let i = 0; i < n; i++) {
      add(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i), new Date(s.getFullYear(), s.getMonth(), s.getDate() + i + 1), period === 'week' ? 'weekday' : 'monthday');
    }
  } else if (period === 'year') {
    for (let m = 0; m < 12; m++) add(new Date(s.getFullYear(), m, 1), new Date(s.getFullYear(), m + 1, 1), 'month');
  } else {
    for (let y = s.getFullYear(); y < range.end.getFullYear(); y++) add(new Date(y, 0, 1), new Date(y + 1, 0, 1), 'year');
  }

  const byCat = new Map<CategoryId, Cents>();
  for (const e of current) byCat.set(e.category, (byCat.get(e.category) ?? 0) + myShare(e, state.groups, home));
  const byCategory = CATEGORIES.map((c) => ({ category: c.id, total: byCat.get(c.id) ?? 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const biggest = [...current].sort((a, b) => myShare(b, state.groups, home) - myShare(a, state.groups, home)).slice(0, 5);

  // Para la media solo cuentan los días que ya han pasado.
  const effectiveEnd = Math.min(range.end.getTime(), now.getTime() + 1);
  const days = Math.max(1, Math.ceil((effectiveEnd - range.start.getTime()) / DAY));
  const months = Math.max(1, Math.round(days / 30.44));

  return {
    range,
    total,
    previousTotal: previous ? sum(mine.filter((e) => inRange(e, previous!)), state) : null,
    partial,
    previousRange: previous,
    buckets,
    byCategory,
    biggest,
    days,
    months,
  };
}

/** Cambio porcentual frente al periodo anterior, o null si no hay base. */
export function changePct(total: Cents, previous: Cents | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((total - previous) / previous) * 100);
}
