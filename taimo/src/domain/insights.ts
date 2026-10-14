import { daysInMonth, homeOf, myShare, type ShareState } from './budget';
import { normalizeMerchant } from './categorize';
import type { AppState, Cents, CategoryId, Expense } from './types';

/** Gastos que no siguen el ritmo diario: se pagan una vez al mes. */
const FIXED: CategoryId[] = ['casa', 'suscripciones'];

export interface Forecast {
  spent: Cents;
  /** Lo que gastarás este mes si sigues a este ritmo. */
  projected: Cents;
  budget: Cents;
}

/**
 * Previsión de fin de mes. Los gastos fijos (casa, suscripciones) se cuentan una
 * vez; el resto se proyecta al ritmo diario que llevas. Antes del día 5 no hay
 * datos suficientes y devuelve null.
 */
export function monthForecast(state: ShareState & Pick<AppState, 'budgets'>, today: Date = new Date()): Forecast | null {
  const day = today.getDate();
  if (day < 5) return null;
  const home = homeOf(state);
  const start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const end = new Date(today.getFullYear(), today.getMonth(), day + 1).getTime();
  let fixed = 0;
  let variable = 0;
  for (const e of state.expenses) {
    const t = new Date(e.date).getTime();
    if (t < start || t >= end) continue;
    const share = myShare(e, state.groups, home);
    if (FIXED.includes(e.category)) fixed += share;
    else variable += share;
  }
  if (fixed + variable === 0) return null;
  const budget = Object.values(state.budgets).reduce<number>((s, v) => s + (v ?? 0), 0);
  return {
    spent: fixed + variable,
    projected: fixed + Math.round((variable / day) * daysInMonth(today)),
    budget,
  };
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
