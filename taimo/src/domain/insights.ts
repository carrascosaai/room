import { categoryStatus, daysInMonth, effectiveBudgets, homeOf, myShare, totalBudget, type BudgetState, type ShareState } from './budget';
import { CATEGORIES } from './categories';
import { normalizeMerchant } from './categorize';
import type { AppState, Cents, CategoryId, Expense, Goal } from './types';

/** Gastos que no siguen el ritmo diario: se pagan una vez al mes. */
const FIXED: CategoryId[] = ['casa', 'suscripciones'];

export interface Forecast {
  spent: Cents;
  /** Lo que gastarás este mes si sigues a este ritmo. */
  projected: Cents;
  budget: Cents;
  /**
   * Lo mismo sin las categorías con sobrante (lo que sobra en ellas ya pasa al
   * mes que viene): con esto se calcula lo que puedes apartar a una meta sin
   * contarlo dos veces.
   */
  free?: { projected: Cents; budget: Cents };
}

/**
 * Previsión de fin de mes. Los gastos fijos (casa, suscripciones) se cuentan una
 * vez; el resto se proyecta al ritmo diario que llevas. Antes del día 5 no hay
 * datos suficientes y devuelve null.
 */
export function monthForecast(state: BudgetState, today: Date = new Date()): Forecast | null {
  const day = today.getDate();
  if (day < 5) return null;
  const home = homeOf(state);
  const start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const end = new Date(today.getFullYear(), today.getMonth(), day + 1).getTime();
  const rolls = (c: CategoryId) => Boolean(state.rollover?.[c] && (state.budgets[c] ?? 0) > 0);
  let fixed = 0;
  let variable = 0;
  let rollFixed = 0;
  let rollVariable = 0;
  for (const e of state.expenses) {
    const t = new Date(e.date).getTime();
    if (t < start || t >= end) continue;
    const share = myShare(e, state.groups, home);
    const isFixed = FIXED.includes(e.category);
    if (isFixed) fixed += share;
    else variable += share;
    if (rolls(e.category)) {
      if (isFixed) rollFixed += share;
      else rollVariable += share;
    }
  }
  if (fixed + variable === 0) return null;
  const budgets = effectiveBudgets(state, today);
  const budget = totalBudget(budgets);
  const project = (f: Cents, v: Cents) => f + Math.round((v / day) * daysInMonth(today));
  const forecast: Forecast = { spent: fixed + variable, projected: project(fixed, variable), budget };
  const rolled = Object.entries(budgets).filter(([c]) => rolls(c as CategoryId)).reduce((s, [, v]) => s + (v ?? 0), 0);
  if (rolled > 0) forecast.free = { projected: project(fixed - rollFixed, variable - rollVariable), budget: budget - rolled };
  return forecast;
}

export interface CategoryTrend {
  category: CategoryId;
  spent: Cents;
  usual: Cents;
  /** % por encima de lo normal a estas alturas del mes. */
  pct: number;
}

/**
 * La categoría que más se está disparando este mes comparada con lo que sueles
 * llevar gastado el mismo día de los meses anteriores (hasta 3). Solo avisa si
 * la diferencia es clara: +30 % y al menos 10 unidades.
 */
export function categoryTrend(state: ShareState, today: Date = new Date()): CategoryTrend | null {
  const home = homeOf(state);
  const day = today.getDate();
  const until = (y: number, m: number) => {
    const start = new Date(y, m, 1).getTime();
    const end = new Date(y, m, Math.min(day, daysInMonth(new Date(y, m, 1))) + 1).getTime();
    const totals = new Map<CategoryId, Cents>();
    let any = false;
    for (const e of state.expenses) {
      const t = new Date(e.date).getTime();
      if (t < start || t >= end) continue;
      any = true;
      totals.set(e.category, (totals.get(e.category) ?? 0) + myShare(e, state.groups, home));
    }
    return any ? totals : null;
  };
  const now = until(today.getFullYear(), today.getMonth());
  if (!now) return null;
  const past = [1, 2, 3].map((k) => until(today.getFullYear(), today.getMonth() - k)).filter((m): m is Map<CategoryId, Cents> => m !== null);
  if (past.length === 0) return null;

  let best: CategoryTrend | null = null;
  for (const [category, spent] of now) {
    if (FIXED.includes(category)) continue;
    const usual = Math.round(past.reduce((s, m) => s + (m.get(category) ?? 0), 0) / past.length);
    if (usual <= 0 || spent - usual < 1000) continue;
    const pct = Math.round(((spent - usual) / usual) * 100);
    if (pct < 30) continue;
    if (!best || spent - usual > best.spent - best.usual) best = { category, spent, usual, pct };
  }
  return best;
}

export interface Subscription {
  /** Nombre tal cual lo ves en el último cargo. */
  merchant: string;
  /** Lo que cuesta al mes (mediana de los cargos). */
  monthly: Cents;
  category: CategoryId;
  lastDate: string;
  months: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function monthIndex(iso: string): number {
  const d = new Date(iso);
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Detecta cobros que se repiten cada mes (Netflix, Spotify, gimnasio, móvil...)
 * entre tus gastos personales: el mismo comercio en al menos 2 meses distintos,
 * como mucho un cargo al mes, con importes casi iguales, el mismo día del mes
 * más o menos y activo en los últimos 45 días.
 */
export function detectSubscriptions(expenses: Expense[], today: Date = new Date()): Subscription[] {
  const byMerchant = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (e.groupId || e.amount <= 0) continue;
    const key = normalizeMerchant(e.merchant);
    if (!key) continue;
    const list = byMerchant.get(key);
    if (list) list.push(e);
    else byMerchant.set(key, [e]);
  }
  const recent = today.getTime() - 45 * 86_400_000;
  const found: Subscription[] = [];
  for (const list of byMerchant.values()) {
    const months = new Set(list.map((e) => monthIndex(e.date)));
    if (months.size < 2 || list.length > months.size * 1.25) continue;
    const span = Math.max(...months) - Math.min(...months) + 1;
    if (months.size / span < 0.6) continue;
    const amounts = list.map((e) => e.amount);
    const m = median(amounts);
    // Las suscripciones cobran casi lo mismo (±10 %, o ±20 % si ya están en esa categoría)…
    const tolerance = list.some((e) => e.category === 'suscripciones') ? 0.2 : 0.1;
    if (amounts.some((a) => Math.abs(a - m) > m * tolerance)) continue;
    // …y más o menos el mismo día del mes (como mucho 6 días de diferencia; el 30 y el 2 están cerca).
    const days = list.map((e) => new Date(e.date).getDate());
    if (days.some((a) => days.some((b) => Math.min(Math.abs(a - b), 31 - Math.abs(a - b)) > 6))) continue;
    const last = list.reduce((a, b) => (a.date > b.date ? a : b));
    if (new Date(last.date).getTime() < recent) continue;
    found.push({ merchant: last.merchant, monthly: m, category: last.category, lastDate: last.date, months: months.size });
  }
  return found.sort((a, b) => b.monthly - a.monthly);
}

/** Busca por comercio, nota o nombre de categoría (sin tildes ni mayúsculas). */
export function matchesSearch(e: Expense, query: string, categoryName: (id: CategoryId) => string): boolean {
  const q = normalizeMerchant(query);
  if (!q) return true;
  const hay = normalizeMerchant(`${e.merchant} ${e.note ?? ''} ${categoryName(e.category)}`);
  return q.split(' ').every((w) => hay.includes(w));
}

/** Cuánto apartar cada mes para llegar a la meta a tiempo (null si no tiene fecha o ya está). */
export function goalPerMonth(goal: Goal, today: Date = new Date()): Cents | null {
  const left = goal.target - goal.saved;
  if (left <= 0 || !goal.deadline) return null;
  const end = new Date(`${goal.deadline}T12:00:00`);
  const months = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
  return Math.ceil(left / Math.max(1, months));
}

/** Lo que previsiblemente te sobrará este mes (para apartarlo a una meta), o 0. */
export function expectedLeftover(forecast: Forecast | null): Cents {
  if (!forecast || forecast.budget === 0) return 0;
  const base = forecast.free ?? forecast;
  const left = base.budget - base.projected;
  // Redondeado a la baja de 5 en 5 para que sea una cifra cómoda.
  return left >= 1000 ? Math.floor(left / 500) * 500 : 0;
}

export interface BudgetSuggestion {
  budgets: Partial<Record<CategoryId, Cents>>;
  /** Meses completos en los que se basa (0 = solo este mes, extrapolado). */
  months: number;
}

/**
 * Presupuesto automático: la media de lo que gastas en cada categoría en tus
 * últimos meses completos (hasta 3), redondeada hacia arriba de 5 en 5. Si aún
 * no hay un mes completo pero llevas 10 días o más, extrapola este mes.
 */
export function suggestBudgets(state: ShareState, today: Date = new Date()): BudgetSuggestion | null {
  const home = homeOf(state);
  const totalsFor = (y: number, m: number, untilDay?: number) => {
    const start = new Date(y, m, 1).getTime();
    const end = untilDay ? new Date(y, m, untilDay + 1).getTime() : new Date(y, m + 1, 1).getTime();
    const totals = new Map<CategoryId, Cents>();
    for (const e of state.expenses) {
      const t = new Date(e.date).getTime();
      if (t >= start && t < end) totals.set(e.category, (totals.get(e.category) ?? 0) + myShare(e, state.groups, home));
    }
    return totals;
  };
  let months = [1, 2, 3].map((k) => totalsFor(today.getFullYear(), today.getMonth() - k)).filter((m) => m.size > 0);
  let scale = 1;
  if (months.length === 0) {
    if (today.getDate() < 10) return null;
    const current = totalsFor(today.getFullYear(), today.getMonth(), today.getDate());
    if (current.size === 0) return null;
    months = [current];
    scale = daysInMonth(today) / today.getDate();
  }
  const budgets: Partial<Record<CategoryId, Cents>> = {};
  for (const c of CATEGORIES) {
    const avg = (months.reduce((s, m) => s + (m.get(c.id) ?? 0), 0) / months.length) * scale;
    if (avg >= 100) budgets[c.id] = Math.ceil(avg / 500) * 500;
  }
  return Object.keys(budgets).length ? { budgets, months: scale === 1 ? months.length : 0 } : null;
}

export interface BudgetAlert {
  category: CategoryId;
  level: 'warning' | 'over';
}

/**
 * Categorías que acaban de cruzar el 80 % o el 100 % de su presupuesto al pasar
 * de `before` a `after` (p. ej. tras apuntar pagos automáticos), para avisar.
 */
export function budgetCrossings(before: ShareState & Pick<AppState, 'budgets'>, after: ShareState & Pick<AppState, 'budgets'>, today: Date = new Date()): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const c of CATEGORIES) {
    const budget = after.budgets[c.id];
    if (!budget) continue;
    const prev = categoryStatus(before, c.id, today);
    const next = categoryStatus(after, c.id, today);
    if (next.spent <= prev.spent) continue;
    if (prev.spent <= budget && next.spent > budget) alerts.push({ category: c.id, level: 'over' });
    else if (prev.spent < budget * 0.8 && next.spent >= budget * 0.8) alerts.push({ category: c.id, level: 'warning' });
  }
  return alerts;
}


export interface MonthRecap {
  /** Primer día del mes. */
  month: Date;
  spent: Cents;
  previous: Cents;
  count: number;
  /** Cuántos se apuntaron solos (Wallet, notificaciones). */
  auto: number;
  top: { category: CategoryId; total: Cents } | null;
  biggestDay: { date: Date; total: Cents } | null;
  budget: Cents;
  /** Tu parte de los gastos compartidos. */
  shared: Cents;
  /**
   * El mes aún no ha terminado: `previous` es solo el mismo tramo del mes
   * anterior (del 1 al 14 contra del 1 al 14), igual que en Resumen.
   */
  partial: boolean;
  /** Tramo del mes anterior con el que se compara. */
  previousRange: { start: Date; end: Date };
}

/** El resumen de un mes ya terminado (o el actual), para verlo y compartirlo. */
export function monthRecap(state: BudgetState, month: Date, now: Date = new Date()): MonthRecap {
  const home = homeOf(state);
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const prevStart = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  // Mes en curso: se compara con los mismos días del mes anterior (como en Resumen).
  const partial = now >= start && now < end;
  const prevEnd = partial ? new Date(Math.min(start.getTime(), prevStart.getTime() + (now.getTime() - start.getTime()))) : start;
  let spent = 0;
  let previous = 0;
  let count = 0;
  let auto = 0;
  let shared = 0;
  const byCat = new Map<CategoryId, Cents>();
  const byDay = new Map<number, Cents>();
  for (const e of state.expenses) {
    const t = new Date(e.date);
    const share = myShare(e, state.groups, home);
    if (t >= prevStart && t < prevEnd) previous += share;
    if (t < start || t >= end || share <= 0) continue;
    spent += share;
    count++;
    if (e.source === 'applepay' || e.source === 'notificacion') auto++;
    if (e.groupId) shared += share;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + share);
    byDay.set(t.getDate(), (byDay.get(t.getDate()) ?? 0) + share);
  }
  const topEntry = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const dayEntry = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    month: start,
    spent,
    previous,
    count,
    auto,
    top: topEntry ? { category: topEntry[0], total: topEntry[1] } : null,
    biggestDay: dayEntry ? { date: new Date(start.getFullYear(), start.getMonth(), dayEntry[0]), total: dayEntry[1] } : null,
    // Con sobrante, el límite de ese mes incluye lo que venía de los anteriores.
    budget: totalBudget(effectiveBudgets(state, start)),
    shared,
    partial,
    previousRange: { start: prevStart, end: prevEnd },
  };
}

/** Cuándo llegará el próximo cobro de una suscripción (mismo día del mes siguiente al último). */
export function nextCharge(sub: Subscription, today: Date = new Date()): Date {
  const last = new Date(sub.lastDate);
  const day = last.getDate();
  let y = last.getFullYear();
  let m = last.getMonth() + 1;
  let next = new Date(y, m, Math.min(day, daysInMonth(new Date(y, m, 1))), 10);
  // Si ya pasó (un cobro que aún no ha llegado este mes), el siguiente.
  while (next.getTime() < today.getTime() - 86_400_000) {
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    next = new Date(y, m, Math.min(day, daysInMonth(new Date(y, m, 1))), 10);
  }
  return next;
}
