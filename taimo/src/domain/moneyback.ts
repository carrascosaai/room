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
  /** Suscripción nueva que parece anual (un cobro grande): no se multiplica por 12. */
  yearly?: boolean;
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

/**
 * Tiendas de aparatos electrónicos (en España, 3 años de garantía por ley desde
 * 2022). Solo de electrónica: en una tienda de todo no sabemos qué se compró.
 */
const WARRANTY_SHOPS = ['mediamarkt', 'media markt', 'worten', 'pccomponentes', 'apple store', 'apple com', 'fnac', 'samsung', 'xiaomi', 'boulanger', 'darty', 'saturn', 'currys', 'best buy', 'phone house', 'k tuin'];
const WARRANTY_YEARS = 3;
/** Como mucho las garantías de las compras más recientes (si no, la lista no se acaba). */
const WARRANTY_MAX = 3;

/** Aerolíneas: si el vuelo llegó con más de 3 h de retraso o se canceló, la ley europea (CE 261/2004) da hasta 600 €. */
const AIRLINES = ['ryanair', 'vueling', 'iberia', 'easyjet', 'air europa', 'volotea', 'binter', 'lufthansa', 'tap air', 'tap portugal', 'klm', 'air france', 'wizz', 'wizzair', 'transavia', 'eurowings', 'british airways', 'ita airways', 'norwegian', 'flylevel', 'level com', 'iberia express', 'swiss air', 'swiss international', 'brussels airlines', 'aegean', 'turkish airlines'];
/** Nombres de aerolínea que también son palabras corrientes («Level Gym», «Swiss Bank»): solo si es el nombre entero. */
const AIRLINES_EXACT = ['level', 'swiss'];
const FLIGHT_MAX = 60000;
/** En España se puede reclamar hasta 5 años después, pero solo avisamos de vuelos del último año… */
const FLIGHT_YEARS = 5;
const FLIGHT_RECENT_DAYS = 365;
/** …y de unos pocos, los más recientes. */
const FLIGHT_MAX_ITEMS = 3;

/** Cobros repetidos: lo normal en transporte (metro, bus, parking) y ocio (entradas) no es un error. */
const DOUBLE_SKIP = new Set(['transporte', 'ocio']);
/** Dos cobros iguales separados por más de esto ya son dos compras. */
const DOUBLE_WINDOW_MS = 10 * 60_000;

/** Facturas que cambian cada mes (luz, gas, agua, teléfono): que suban no es una subida de precio. */
const VARIABLE_BILLS = ['iberdrola', 'endesa', 'naturgy', 'holaluz', 'repsol', 'totalenergies', 'total energies', 'edp', 'octopus', 'factor energia', 'lucera', 'som energia', 'canal de isabel', 'aguas', 'agua', 'aigues', 'gas natural', 'luz', 'electricidad', 'energia', 'energy'];

/** Más que esto en el primer cobro: seguramente es un pago anual, no mensual. */
const YEARLY_FROM = 3000;

/** Palabra entera (o varias seguidas): «cos» no casa con «cosmetics», ni «swiss» con «swissotel». */
const has = (key: string, words: string[]) => words.some((w) => ` ${key} `.includes(` ${w.trim()} `));

function returnDays(key: string): number | null {
  for (const [shops, days] of RETURN_DAYS) if (has(key, shops)) return days;
  return null;
}

/** ¿Lleva la hora de verdad del cobro? Solo los que se apuntan solos (Apple Pay, aviso del banco); a mano o del extracto, solo el día. */
const hasTime = (e: Expense) => (e.source === 'applepay' || e.source === 'notificacion') && e.date.length > 10;

/**
 * Cobros repetidos: mismo comercio, mismo importe y mismo día; y si sabemos la
 * hora, con menos de 10 minutos entre uno y otro (dos cafés por la mañana y por
 * la tarde son dos compras).
 */
function doubles(expenses: Expense[], since: number): MoneyBack[] {
  const seen = new Map<string, Expense[]>();
  const out: MoneyBack[] = [];
  const sorted = [...expenses]
    .filter((e) => !e.groupId && e.amount >= 1000 && !DOUBLE_SKIP.has(e.category) && new Date(e.date).getTime() >= since)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const key = `${normalizeMerchant(e.merchant)}|${e.amount}|${e.date.slice(0, 10)}`;
    const before = seen.get(key) ?? [];
    const twin = before.find((f) => !hasTime(e) || !hasTime(f) || Math.abs(new Date(e.date).getTime() - new Date(f.date).getTime()) <= DOUBLE_WINDOW_MS);
    if (twin) out.push({ id: `double-${e.id}`, kind: 'double', merchant: e.merchant, amount: e.amount, expenseId: e.id });
    seen.set(key, [...before, e]);
  }
  return out;
}

/** Suscripciones que suben de precio y suscripciones nuevas (¿una prueba gratis que ya cobra?). */
function subscriptionAlerts(expenses: Expense[], today: Date): MoneyBack[] {
  const out: MoneyBack[] = [];
  const personal = expenses.filter((e) => !e.groupId && e.amount > 0);
  for (const sub of detectSubscriptions(personal, today)) {
    const key = normalizeMerchant(sub.merchant);
    // Luz, agua, teléfono…: cambian cada mes, no es una subida.
    if (sub.category === 'casa' || has(key, VARIABLE_BILLS)) continue;
    const charges = personal.filter((e) => normalizeMerchant(e.merchant) === key).sort((a, b) => a.date.localeCompare(b.date));
    const last = charges[charges.length - 1];
    const before = charges.slice(0, -1).map((e) => e.amount);
    const prev = before[before.length - 1];
    if (prev && last.amount - prev >= 50 && last.amount > prev * 1.03) {
      // Id por comercio (no por importe): si dices «está bien», no vuelve a salir con cada céntimo.
      out.push({ id: `up-${key}`, kind: 'priceUp', merchant: last.merchant, amount: (last.amount - prev) * 12, expenseId: last.id, before: prev, now: last.amount });
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
    // Un primer cobro grande suele ser anual: no se multiplica por 12.
    const yearly = e.amount > YEARLY_FROM;
    out.push({ id: `new-${k}`, kind: 'newSub', merchant: e.merchant, amount: yearly ? e.amount : e.amount * 12, now: e.amount, expenseId: e.id, ...(yearly ? { yearly } : {}) });
  }
  return out;
}

function isAirline(key: string): boolean {
  return has(key, AIRLINES) || AIRLINES_EXACT.includes(key);
}

function purchases(expenses: Expense[], today: Date): MoneyBack[] {
  const out: MoneyBack[] = [];
  const flights: MoneyBack[] = [];
  const warranties: MoneyBack[] = [];
  const t = isoDay(today);
  const recentFlight = isoDay(new Date(today.getTime() - FLIGHT_RECENT_DAYS * DAY));
  for (const e of expenses) {
    if (e.groupId || e.amount <= 0) continue;
    const key = normalizeMerchant(e.merchant);
    const day = e.date.slice(0, 10);
    if (isAirline(key) && e.category !== 'comer' && e.category !== 'deporte' && e.category !== 'super') {
      const until = addYears(day, FLIGHT_YEARS);
      if (until >= t && day >= recentFlight) flights.push({ id: `flight-${e.id}`, kind: 'flight', merchant: e.merchant, amount: FLIGHT_MAX, expenseId: e.id, until });
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
    if (e.category === 'compras' && has(key, WARRANTY_SHOPS) && e.amount >= 5000) {
      const until = addYears(day, WARRANTY_YEARS);
      if (until >= t) warranties.push({ id: `warranty-${e.id}`, kind: 'warranty', merchant: e.merchant, amount: e.amount, expenseId: e.id, until });
    }
  }
  // Lo más reciente primero (la fecha límite más lejana) y solo unos pocos.
  const newest = (a: MoneyBack, b: MoneyBack) => (b.until ?? '').localeCompare(a.until ?? '');
  return [...out, ...flights.sort(newest).slice(0, FLIGHT_MAX_ITEMS), ...warranties.sort(newest).slice(0, WARRANTY_MAX)];
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
