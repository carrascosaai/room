import { describe, expect, it } from 'vitest';

import { myShare, monthSummary } from '../src/domain/budget';
import { dueRecurring, groupBudgetPlan, groupInsights, recurringExpenseId, tripDays } from '../src/domain/groupInsights';
import { balances, exactRemainder, nextPayer, splitByWeights, splitEqually } from '../src/domain/groups';
import { applySnapshot, buildPush, type GroupSnapshot } from '../src/domain/sync';
import type { AppState, Expense, Group } from '../src/domain/types';
import { convert, FALLBACK, fetchRates, isStale, parseRatesResponse, rateBetween } from '../src/fx/fx';
import { initialState } from '../src/store/store';

describe('monedas del mundo', () => {
  it('convierte entre cualquier par usando el euro como puente', () => {
    const rates = { ...FALLBACK, rates: { USD: 1.1, JPY: 176, NOK: 10.7, GBP: 0.85 } };
    expect(rateBetween('EUR', 'EUR', rates)).toBe(1);
    expect(convert(1000, 'EUR', 'USD', rates)).toBe(1100);
    expect(convert(17600, 'JPY', 'EUR', rates)).toBe(100);
    // 3000 JPY -> NOK = 3000 / 176 * 10.7
    expect(convert(300000, 'JPY', 'NOK', rates)).toBe(Math.round((300000 / 176) * 10.7));
    expect(convert(100, 'XXX', 'EUR', rates)).toBeNull();
  });

  it('trae tipos de respaldo de más de 150 monedas', () => {
    expect(Object.keys(FALLBACK.rates).length).toBeGreaterThan(150);
    expect(FALLBACK.rates.JPY).toBeGreaterThan(100);
    expect(isStale(FALLBACK)).toBe(true);
  });

  it('entiende las dos fuentes de tipos de cambio', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    const a = parseRatesResponse({ date: '2026-10-14', eur: Object.fromEntries(Object.entries(FALLBACK.rates).map(([k, v]) => [k.toLowerCase(), v])) }, now);
    expect(a?.rates.USD).toBe(FALLBACK.rates.USD);
    expect(a?.source).toBe('online');
    const b = parseRatesResponse({ result: 'success', base_code: 'EUR', time_last_update_utc: 'Tue, 14 Oct 2026 00:00:01 +0000', rates: FALLBACK.rates }, now);
    expect(b?.date).toBe('2026-10-14');
    expect(parseRatesResponse({ nope: 1 }, now)).toBeNull();
    expect(isStale(a!, new Date('2026-10-14T20:00:00Z'))).toBe(false);
    expect(isStale(a!, new Date('2026-10-15T00:00:00Z'))).toBe(true);
  });

  it('si una fuente falla prueba la siguiente; sin conexión devuelve null', async () => {
    let calls = 0;
    const fake = (async (url: string) => {
      calls++;
      if (url.includes('jsdelivr')) throw new Error('offline');
      return { ok: true, json: async () => ({ date: '2026-10-14', eur: { ...Object.fromEntries(Object.keys(FALLBACK.rates).map((k) => [k.toLowerCase(), 1])), usd: 1.1 } }) };
    }) as unknown as typeof fetch;
    const r = await fetchRates(fake);
    expect(r?.rates.USD).toBe(1.1);
    expect(calls).toBe(2);
    const dead = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchRates(dead)).toBeNull();
  });
});

const ana = { id: 'ana', name: 'Ana' };
const me = { id: 'me', name: 'Yo', isMe: true };
const luis = { id: 'luis', name: 'Luis' };

describe('repartos', () => {
  it('por proporción (pareja 60/40) y familias que cuentan doble, sin perder céntimos', () => {
    expect(splitByWeights(10000, { me: 60, ana: 40 })).toEqual({ me: 6000, ana: 4000 });
    const s = splitByWeights(1000, { a: 2, b: 1, c: 1 });
    expect(s).toEqual({ a: 500, b: 250, c: 250 });
    const odd = splitByWeights(1001, { a: 1, b: 1, c: 1 });
    expect(Object.values(odd).reduce((x, y) => x + y, 0)).toBe(1001);
  });

  it('importes exactos: cuánto falta para cuadrar', () => {
    expect(exactRemainder(5000, { a: 2000, b: 2500 })).toBe(500);
    expect(exactRemainder(5000, { a: 3000, b: 2500 })).toBe(-500);
  });

  it('a quién le toca pagar: al que más debe', () => {
    expect(nextPayer({ me: 3000, ana: -3000 })).toBe('ana');
    expect(nextPayer({ me: 0, ana: 0 })).toBeNull();
  });
});

const exp = (p: Partial<Expense>): Expense => ({ id: Math.random().toString(36), amount: 1000, merchant: 'X', category: 'otros', date: '2026-11-03T10:00:00.000Z', source: 'manual', ...p });

describe('viajes', () => {
  const trip: Group = {
    id: 'jp', name: 'Japón', emoji: '✈️', kind: 'trip', currency: 'EUR', budget: 300000, trip: { start: '2026-11-01', end: '2026-11-10' },
    createdAt: '2026-10-01', members: [me, ana, luis],
  };
  const expenses = [
    exp({ groupId: 'jp', amount: 9000, paidBy: 'me', shares: splitEqually(9000, ['me', 'ana', 'luis']), original: { amount: 1500000, currency: 'JPY', rate: 0.006 }, category: 'casa' }),
    exp({ groupId: 'jp', amount: 3000, paidBy: 'ana', shares: splitEqually(3000, ['me', 'ana', 'luis']), category: 'comer' }),
  ];

  it('días, presupuesto restante y gasto por persona y día', () => {
    expect(tripDays(trip)).toBe(10);
    const plan = groupBudgetPlan(trip, expenses, new Date('2026-11-05T12:00:00'))!;
    expect(plan.spent).toBe(12000);
    expect(plan.remaining).toBe(288000);
    expect(plan.daysLeft).toBe(6);
    expect(plan.perDay).toBe(48000);
    expect(plan.perPersonPerDay).toBe(16000);
  });

  it('resumen: quién pagó, qué le toca a cada uno y en qué monedas se pagó', () => {
    const ins = groupInsights(trip, expenses);
    expect(ins.total).toBe(12000);
    expect(ins.paidBy).toEqual({ me: 9000, ana: 3000 });
    expect(ins.shareOf.luis).toBe(4000);
    expect(ins.byCurrency).toEqual({ JPY: 1500000, EUR: 3000 });
    expect(balances(trip, expenses, []).luis).toBe(-4000);
  });

  it('tu parte de un grupo en otra moneda cuenta en la tuya', () => {
    const nokGroup: Group = { ...trip, id: 'no', currency: 'NOK' };
    const e = exp({ groupId: 'no', amount: 30000, paidBy: 'ana', shares: { me: 10700, ana: 19300 } });
    const rates = { ...FALLBACK, rates: { ...FALLBACK.rates, NOK: 10.7 } };
    expect(myShare(e, [nokGroup], { home: 'EUR', fx: rates })).toBe(1000);
    expect(myShare(e, [nokGroup])).toBe(10700); // sin datos de moneda, tal cual
    const state = { expenses: [{ ...e, date: new Date(2026, 9, 5).toISOString() }], groups: [nokGroup], budgets: { otros: 5000 }, profile: { name: '', currency: 'EUR' }, fx: rates };
    expect(monthSummary(state, new Date(2026, 9, 14)).spent).toBe(1000);
  });
});

describe('piso y pareja: gastos fijos', () => {
  const flat: Group = {
    id: 'piso', name: 'Piso', emoji: '🏠', kind: 'flat', createdAt: '2026-01-01', members: [me, ana],
    recurring: [{ id: 'alq', name: 'Alquiler', amount: 90000, category: 'casa', paidBy: 'me', day: 1 }, { id: 'luz', name: 'Luz', amount: 6000, category: 'casa', paidBy: 'ana', day: 20 }],
  };
  const split = (a: number) => splitEqually(a, ['me', 'ana']);

  it('se crean cuando llega el día, una sola vez por mes y con el mismo id en todos los móviles', () => {
    const day14 = new Date(2026, 9, 14, 12);
    const due = dueRecurring(flat, [], day14, split);
    expect(due.map((e) => e.merchant)).toEqual(['Alquiler']);
    expect(due[0].id).toBe(recurringExpenseId(flat.recurring![0], '2026-10'));
    expect(due[0].shares).toEqual({ me: 45000, ana: 45000 });
    expect(dueRecurring(flat, due, day14, split)).toEqual([]);
    expect(dueRecurring(flat, due, new Date(2026, 9, 21), split).map((e) => e.merchant)).toEqual(['Luz']);
  });

  it('presupuesto común del mes: solo cuentan los gastos de este mes', () => {
    const g = { ...flat, budget: 50000 };
    const plan = groupBudgetPlan(g, [exp({ groupId: 'piso', amount: 20000, date: new Date(2026, 9, 3).toISOString() }), exp({ groupId: 'piso', amount: 99999, date: new Date(2026, 8, 3).toISOString() })], new Date(2026, 9, 14))!;
    expect(plan.spent).toBe(20000);
    expect(plan.daysLeft).toBe(18);
  });
});

describe('sincronización v2', () => {
  const group: Group = {
    id: 'g', name: 'Pareja', emoji: '❤️', kind: 'couple', currency: 'EUR', weights: { me: 60, ana: 40 }, budget: 40000,
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z', remote: { code: 'ABCDEFGHJKMNPQRS' }, members: [me, ana],
  };
  const state: AppState = {
    ...initialState,
    groups: [group],
    expenses: [exp({ id: 'e1', groupId: 'g', paidBy: 'me', shares: { me: 600, ana: 400 }, splitMode: 'weights', weights: { me: 60, ana: 40 }, original: { amount: 1100, currency: 'USD', rate: 0.909 } })],
  };

  it('envía los ajustes del grupo y cómo se repartió cada gasto', () => {
    const push = buildPush(state, 'g');
    expect(push.group).toMatchObject({ kind: 'couple', currency: 'EUR', meta: { weights: { me: 60, ana: 40 }, budget: 40000 } });
    expect(push.expenses[0].extra).toEqual({ splitMode: 'weights', weights: { me: 60, ana: 40 }, original: { amount: 1100, currency: 'USD', rate: 0.909 } });
  });

  it('aplica los ajustes que vienen del servidor, salvo los que acabo de cambiar', () => {
    const snap: GroupSnapshot = {
      group: { id: 'g', name: 'Pareja ❤', emoji: '💑', code: 'ABCDEFGHJKMNPQRS', kind: 'couple', currency: 'EUR', meta: { budget: 50000, weights: { me: 50, ana: 50 } }, updatedAt: '2026-10-03T00:00:00.000Z' },
      members: [], expenses: [], settlements: [],
    };
    const next = applySnapshot(state, 'g', snap, '2026-10-04T00:00:00.000Z');
    expect(next.groups[0]).toMatchObject({ name: 'Pareja ❤', budget: 50000, weights: { me: 50, ana: 50 } });
    const editedLocally = { ...state, groups: [{ ...group, updatedAt: '2026-10-05T00:00:00.000Z', budget: 99900 }] };
    expect(applySnapshot(editedLocally, 'g', snap, '2026-10-04T00:00:00.000Z').groups[0].budget).toBe(99900);
  });
});
