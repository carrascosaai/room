import { normalizeMerchant } from './categorize';
import { detectSubscriptions } from './insights';
import type { AppState, Cents, Expense } from './types';

/**
 * «Taimo te devuelve dinero»: busca entre tus pagos dinero que es tuyo y que
 * puedes recuperar o dejar de perder. Todo se calcula en el móvil con lo que
 * Taimo ya ve (pagos y tickets); no se manda nada a ningún sitio.
 */
export type MoneyBackKind = 'double' | 'priceUp' | 'newSub' | 'returnWindow' | 'flight' | 'warranty';

export interface MoneyBack {
  /** Estable entre aperturas (para poder descartarlo o marcarlo como recuperado). */
  id: string;
  kind: MoneyBackKind;
  merchant: string;
  /** Lo que puedes recuperar o ahorrar (al año en suscripciones; «hasta» en vuelos). */
  amount: Cents;
  expenseId?: string;
  /** Fecha límite (devoluciones, garantías), ISO YYYY-MM-DD. */
  until?: string;
  /** Precio antes y ahora (subidas). */
  before?: Cents;
  now?: Cents;
}

export interface MoneyBackState {
  dismissed: string[];
  recovered: { id: string; amount: Cents; date: string }[];
}

const DAY = 86_400_000;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d);
};
const addYears = (iso: string, years: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return isoDay(d);
};

/** Días para devolver en tiendas habituales (política general; online siempre al menos 14 por ley en la UE). */
const RETURN_DAYS: [string[], number][] = [
  [['ikea'], 365],
  [['decathlon'], 365],
  [['zara', 'bershka', 'pull bear', 'stradivarius', 'massimo dutti', 'oysho', 'lefties', 'mango', 'h m', 'hm ', 'uniqlo', 'cos ', 'sfera'], 30],
  [['el corte ingles', 'fnac', 'leroy merlin', 'amazon', 'zalando', 'apple', 'pccomponentes', 'sprinter', 'jd sports', 'nike', 'adidas', 'kiabi'], 30],
  [['primark'], 28],
  [['mediamarkt', 'media markt', 'worten', 'carrefour'], 15],
  [['shein', 'aliexpress', 'temu', 'vinted', 'ebay'], 14],
];

/** Tiendas donde lo normal es comprar aparatos con garantía (en España, 3 años por ley desde 2022). */
const WARRANTY_SHOPS = ['mediamarkt', 'media markt', 'worten', 'pccomponentes', 'apple', 'fnac', 'el corte ingles', 'amazon', 'samsung', 'xiaomi', 'conforama', 'leroy merlin', 'ikea', 'carrefour', 'boulanger', 'saturn', 'currys', 'best buy'];
const WARRANTY_YEARS = 3;

/** Aerolíneas: si el vuelo llegó con más de 3 h de retraso o se canceló, la ley europea (CE 261/2004) da hasta 600 €. */
const AIRLINES = ['ryanair', 'vueling', 'iberia', 'easyjet', 'air europa', 'volotea', 'binter', 'lufthansa', 'tap air', 'klm', 'air france', 'wizz', 'transavia', 'eurowings', 'british airways', 'ita airways', 'norwegian', 'level', 'iberia express', 'swiss', 'brussels airlines', 'aegean', 'turkish airlines'];
const FLIGHT_MAX = 60000;
/** En España se puede reclamar hasta 5 años después. */
const FLIGHT_YEARS = 5;

const has = (key: string, words: string[]) => words.some((w) => ` ${key} `.includes(` ${w.trim()} `) || key.startsWith(w.trim()));

function returnDays(key: string): number | null {
  for (const [shops, days] of RETURN_DAYS) if (has(key, shops)) return days;
  return null;
}

/** Cobros repetidos: mismo comercio, mismo importe y mismo día (y no es un café que repites). */
function doubles(expenses: Expense[], since: number): MoneyBack[] {
  const seen = new Map<string, Expense>();
  const out: MoneyBack[] = [];
  const sorted = [...expenses].filter((e) => !e.groupId && e.amount >= 1000 && new Date(e.date).getTime() >= since).sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const key = `${normalizeMerchant(e.merchant)}|${e.amount}|${e.date.slice(0, 10)}`;
    const first = seen.get(key);
    if (first) out.push({ id: `double-${e.id}`, kind: 'double', merchant: e.merchant, amount: e.amount, expenseId: e.id });
    else seen.set(key, e);
  }
  return out;
}

/** Suscripciones que suben de precio y suscripciones nuevas (¿una prueba gratis que ya cobra?). */
function subscriptionAlerts(expenses: Expense[], today: Date): MoneyBack[] {
  const out: MoneyBack[] = [];
  const personal = expenses.filter((e) => !e.groupId && e.amount > 0);
  for (const sub of detectSubscriptions(personal, today)) {
    const key = normalizeMerchant(sub.merchant);
    const charges = personal.filter((e) => normalizeMerchant(e.merchant) === key).sort((a, b) => a.date.localeCompare(b.date));
    const last = charges[charges.length - 1];
    const before = charges.slice(0, -1).map((e) => e.amount);
    const prev = before[before.length - 1];
    if (prev && last.amount - prev >= 50 && last.amount > prev * 1.03) {
      out.push({ id: `up-${key}-${last.amount}`, kind: 'priceUp', merchant: last.merchant, amount: (last.amount - prev) * 12, expenseId: last.id, before: prev, now: last.amount });
    }
  }
  // Primer cargo de algo que parece una suscripción, en los últimos 10 días.
  const recent = today.getTime() - 10 * DAY;
  const byKey = new Map<string, Expense[]>();
  for (const e of personal) {
    const k = normalizeMerchant(e.merchant);
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }
  for (const [k, list] of byKey) {
    if (list.length !== 1) continue;
    const e = list[0];
    if (e.category !== 'suscripciones' || new Date(e.date).getTime() < recent) continue;
    out.push({ id: `new-${k}`, kind: 'newSub', merchant: e.merchant, amount: e.amount * 12, expenseId: e.id });
  }
  return out;
}

function purchases(expenses: Expense[], today: Date): MoneyBack[] {
  const out: MoneyBack[] = [];
  const t = isoDay(today);
  for (const e of expenses) {
    if (e.groupId || e.amount <= 0) continue;
    const key = normalizeMerchant(e.merchant);
    const day = e.date.slice(0, 10);
    if (has(key, AIRLINES) && e.category !== 'comer') {
      const until = addYears(day, FLIGHT_YEARS);
      if (until >= t) out.push({ id: `flight-${e.id}`, kind: 'flight', merchant: e.merchant, amount: FLIGHT_MAX, expenseId: e.id, until });
      continue;
    }
    if (e.category !== 'compras' && e.category !== 'casa' && e.category !== 'deporte') continue;
    const days = returnDays(key);
    if (days && e.amount >= 1500) {
      const until = addDays(day, days);
      // Solo cuando queda poco: lo útil es el aviso «aún estás a tiempo».
      const left = Math.round((new Date(`${until}T12:00:00`).getTime() - new Date(`${t}T12:00:00`).getTime()) / DAY);
      if (left >= 0 && left <= Math.min(7, days)) out.push({ id: `return-${e.id}`, kind: 'returnWindow', merchant: e.merchant, amount: e.amount, expenseId: e.id, until });
    }
    if (has(key, WARRANTY_SHOPS) && e.amount >= 5000) {
      const until = addYears(day, WARRANTY_YEARS);
      if (until >= t) out.push({ id: `warranty-${e.id}`, kind: 'warranty', merchant: e.merchant, amount: e.amount, expenseId: e.id, until });
    }
  }
  return out;
}

const URGENCY: Record<MoneyBackKind, number> = { double: 0, returnWindow: 1, newSub: 2, priceUp: 3, flight: 4, warranty: 5 };

/** Todo lo que Taimo ha encontrado, lo más urgente primero. Quita lo descartado y lo ya recuperado. */
export function findMoneyBack(state: Pick<AppState, 'expenses'> & { moneyBack?: MoneyBackState }, today: Date = new Date()): MoneyBack[] {
  const hidden = new Set([...(state.moneyBack?.dismissed ?? []), ...(state.moneyBack?.recovered ?? []).map((r) => r.id)]);
  const all = [...doubles(state.expenses, today.getTime() - 60 * DAY), ...subscriptionAlerts(state.expenses, today), ...purchases(state.expenses, today)];
  return all
    .filter((m) => !hidden.has(m.id))
    .sort((a, b) => URGENCY[a.kind] - URGENCY[b.kind] || (a.until ?? '').localeCompare(b.until ?? '') || b.amount - a.amount);
}

/** Lo que merece un aviso en Inicio (lo demás se ve en la pantalla). */
export function urgentMoneyBack(items: MoneyBack[]): MoneyBack[] {
  return items.filter((m) => m.kind === 'double' || m.kind === 'returnWindow' || m.kind === 'newSub' || m.kind === 'priceUp');
}

/** Lo que Taimo te ha ayudado a recuperar (en total y este año). */
export function recoveredTotal(state: { moneyBack?: MoneyBackState }, today: Date = new Date()): { total: Cents; thisYear: Cents } {
  const list = state.moneyBack?.recovered ?? [];
  const year = String(today.getFullYear());
  return {
    total: list.reduce((s, r) => s + r.amount, 0),
    thisYear: list.filter((r) => r.date.startsWith(year)).reduce((s, r) => s + r.amount, 0),
  };
}

/** Mensaje para reclamar un cobro repetido al comercio o al banco. */
export function claimText(item: MoneyBack, expense: Expense | undefined, format: (c: Cents) => string, template: string): string {
  return template
    .replace('{merchant}', item.merchant)
    .replace('{amount}', format(item.amount))
    .replace('{date}', expense ? expense.date.slice(0, 10) : '');
}
