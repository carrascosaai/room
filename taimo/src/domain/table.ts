import { decodeJson, encodeJson, linkData } from './b64';
import type { AppState, Cents, Expense, Group, PaymentInfo, Settlement } from './types';

/**
 * «Paga tu parte»: la cuenta de la mesa en 10 segundos.
 *
 * Quien paga enseña un QR con el ticket. Los demás lo abren en el navegador
 * (sin instalar nada), tocan lo que han tomado, pagan su parte y le mandan un
 * aviso por WhatsApp. Al abrir ese aviso, Taimo apunta quién ha pagado y en el
 * presupuesto de quien pagó solo cuenta lo suyo. Todo va dentro del QR y de los
 * enlaces: no hace falta servidor ni cuenta.
 */
export interface TableBill {
  /** Id de la mesa (para casar los avisos con el gasto). */
  id: string;
  /** Comercio */
  m: string;
  /** Moneda */
  c: string;
  /** Quién pagó y cómo cobra */
  t: string;
  p: PaymentInfo;
  /** Productos [nombre, importe] */
  i: [string, Cents][];
  /** Índices de los productos que se comparten entre todos (vino, entrantes…). */
  s?: number[];
  /** Personas en la mesa (incluido quien pagó). */
  n: number;
  /** Diferencia entre el total y la suma de productos (propina, servicio, descuento): se reparte entre todos. */
  x?: Cents;
  /** Fecha YYYY-MM-DD */
  d?: string;
}

/** Lo que manda cada comensal a quien pagó: quién es, qué tomó y cuánto ha pagado. */
export interface TableClaim {
  b: string;
  w: string;
  i: number[];
  a: Cents;
}

export const MAX_ITEMS = 40;
export const MAX_PEOPLE = 30;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cents = (v: unknown) => (Number.isInteger(v) && Math.abs(v as number) <= 100_000_000 ? (v as number) : null);

/** Total del ticket. */
export function billTotal(bill: TableBill): Cents {
  return bill.i.reduce((s, [, a]) => s + a, 0) + (bill.x ?? 0);
}

/** Lo que se reparte entre todos: productos compartidos y la diferencia (propina…). */
function sharedPool(bill: TableBill): Cents {
  const shared = new Set(bill.s ?? []);
  return bill.i.reduce((s, [, a], idx) => (shared.has(idx) ? s + a : s), 0) + (bill.x ?? 0);
}

/** Lo que le toca a cada uno de lo compartido. */
export function sharedPart(bill: TableBill): Cents {
  return Math.round(sharedPool(bill) / Math.max(1, bill.n));
}

/** Lo que paga quien elige `picked`: sus productos más su parte de lo compartido. */
export function claimAmount(bill: TableBill, picked: number[]): Cents {
  const shared = new Set(bill.s ?? []);
  const mine = [...new Set(picked)].filter((i) => i >= 0 && i < bill.i.length && !shared.has(i));
  return mine.reduce((s, i) => s + bill.i[i][1], 0) + sharedPart(bill);
}

export function encodeBill(bill: TableBill): string {
  return encodeJson(bill);
}

export function decodeBill(input: string): TableBill | null {
  try {
    const raw = decodeJson(linkData(input)) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.i)) return null;
    const id = str(raw.id, 32);
    const c = str(raw.c, 8).toUpperCase();
    const n = Number(raw.n);
    if (!id || !/^[A-Z]{3}$/.test(c) || !Number.isInteger(n) || n < 1 || n > MAX_PEOPLE) return null;
    const items: [string, Cents][] = [];
    for (const it of raw.i.slice(0, MAX_ITEMS)) {
      if (!Array.isArray(it)) return null;
      const a = cents(it[1]);
      if (a === null || a < 0) return null;
      items.push([str(it[0], 40) || '·', a]);
    }
    const s = Array.isArray(raw.s) ? [...new Set(raw.s.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < items.length))] : [];
    const x = raw.x === undefined ? 0 : cents(raw.x);
    if (x === null) return null;
    const p: PaymentInfo = {};
    const pay = (raw.p ?? {}) as Record<string, unknown>;
    for (const k of ['bizum', 'iban', 'paypal', 'revolut'] as const) {
      const v = str(pay[k], 40);
      if (v) p[k] = v;
    }
    const bill: TableBill = { id, m: str(raw.m, 48), c, t: str(raw.t, 40), p, i: items, n, ...(s.length ? { s } : {}), ...(x ? { x } : {}), ...(raw.d ? { d: str(raw.d, 10) } : {}) };
    return billTotal(bill) > 0 ? bill : null;
  } catch {
    return null;
  }
}

export function encodeClaim(claim: TableClaim): string {
  return encodeJson(claim);
}

export function decodeClaim(input: string): TableClaim | null {
  try {
    const raw = decodeJson(linkData(input)) as Record<string, unknown>;
    const b = str(raw?.b, 32);
    const w = str(raw?.w, 40);
    const a = cents(raw?.a);
    if (!b || !w || a === null || a <= 0) return null;
    const i = Array.isArray(raw.i) ? raw.i.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < MAX_ITEMS).slice(0, MAX_ITEMS) : [];
    return { b, w, i, a };
  } catch {
    return null;
  }
}

/** Enlace (y contenido del QR) de la mesa. */
export function billLink(base: string, bill: TableBill): string {
  return `${base.replace(/\/+$/, '')}/mesa#${encodeBill(bill)}`;
}

/** Enlace del aviso «ya he pagado» que vuelve a quien pagó. */
export function claimLink(base: string, claim: TableClaim): string {
  return `${base.replace(/\/+$/, '')}/mesa-pagado#${encodeClaim(claim)}`;
}

/** Busca un enlace de aviso dentro de un mensaje pegado («Ya te he pagado… https://…/mesa-pagado#…»). */
export function findClaimInText(text: string): TableClaim | null {
  const m = text.match(/mesa-pagado[^\s#]*#([A-Za-z0-9_-]+)/) ?? text.match(/mesa-pagado\?d=([A-Za-z0-9_-]+)/);
  return m ? decodeClaim(m[1]) : null;
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'x';

/**
 * Convierte un gasto personal en la mesa: un grupo pequeño solo contigo, con el
 * gasto pagado por ti. Al llegar los avisos se van añadiendo los comensales.
 */
export function startTable(state: AppState, expenseId: string, bill: TableBill, meId: string, now = new Date()): { state: AppState; groupId: string } | null {
  const e = state.expenses.find((x) => x.id === expenseId);
  if (!e || e.groupId) return null;
  const at = now.toISOString();
  const currency = e.original?.currency ?? state.profile.currency;
  const total = e.original?.amount ?? e.amount;
  const group: Group = {
    id: `mesa-${bill.id}`,
    name: e.merchant || '🍽️',
    emoji: '🍽️',
    kind: 'other',
    currency,
    createdAt: at,
    updatedAt: at,
    members: [{ id: meId, name: state.profile.name || '·', isMe: true }],
    table: bill,
  };
  const moved: Expense = { ...e, amount: total, original: undefined, groupId: group.id, paidBy: meId, shares: { [meId]: total }, splitMode: 'exact', updatedAt: at };
  return {
    groupId: group.id,
    state: { ...state, groups: [...state.groups, group], expenses: state.expenses.map((x) => (x.id === e.id ? moved : x)) },
  };
}

export type ClaimResult = { state: AppState; status: 'added' | 'updated'; amount: Cents } | { state: AppState; status: 'unknown' | 'nothingLeft' };

/**
 * Apunta el aviso de un comensal: lo añade a la mesa, le asigna su parte y
 * deja su pago hecho. Si vuelve a llegar el mismo aviso, no se duplica.
 */
export function applyTableClaim(state: AppState, claim: TableClaim, now = new Date()): ClaimResult {
  const group = state.groups.find((g) => g.table?.id === claim.b);
  const me = group?.members.find((m) => m.isMe);
  const expense = group && state.expenses.find((e) => e.groupId === group.id);
  if (!group || !me || !expense) return { state, status: 'unknown' };
  const at = now.toISOString();
  const memberId = `mesa-${slug(claim.w)}`;
  const existing = group.members.find((m) => m.id === memberId);
  const shares = { ...(expense.shares ?? {}) };
  const othersBefore = Object.entries(shares).reduce((s, [id, a]) => (id === me.id || id === memberId ? s : s + a), 0);
  const left = expense.amount - othersBefore;
  if (left <= 0) return { state, status: 'nothingLeft' };
  const amount = Math.min(claim.a, left);
  shares[memberId] = amount;
  shares[me.id] = left - amount;
  const settlement: Settlement = { id: `${group.id}-${memberId}`, groupId: group.id, from: memberId, to: me.id, amount, date: at, updatedAt: at };
  const members = existing ? group.members : [...group.members, { id: memberId, name: claim.w, updatedAt: at }];
  return {
    status: existing ? 'updated' : 'added',
    amount,
    state: {
      ...state,
      groups: state.groups.map((g) => (g.id === group.id ? { ...g, members, updatedAt: at } : g)),
      expenses: state.expenses.map((e) => (e.id === expense.id ? { ...e, shares, splitMode: 'exact', updatedAt: at } : e)),
      settlements: [...state.settlements.filter((s) => s.id !== settlement.id), settlement],
    },
  };
}
