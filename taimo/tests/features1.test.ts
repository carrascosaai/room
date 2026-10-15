import { describe, expect, it } from 'vitest';

import { chargesWithin, leftAfterCharges, upcomingCharges } from '../src/domain/calendar';
import { cashBalance, cashMovements } from '../src/domain/cash';
import { reviewQueue } from '../src/domain/review';
import { safeToSpendToday } from '../src/domain/today';
import type { AppState, Expense, Group } from '../src/domain/types';
import { initialState, migrate, reducer } from '../src/store/store';

let n = 0;
const e = (date: Date, amount: number, merchant = 'Bar', extra: Partial<Expense> = {}): Expense => ({
  id: `f${n++}`,
  amount,
  merchant,
  category: 'comer',
  date: date.toISOString(),
  source: 'manual',
  ...extra,
});
// 14 de octubre de 2026 (31 días): quedan 18 días contando hoy.
const today = new Date(2026, 9, 14, 18);

describe('Hoy puedes gastar', () => {
  it('reparte lo que quedaba al empezar el día y resta lo de hoy', () => {
    const state = { groups: [], budgets: { comer: 50000 }, expenses: [e(new Date(2026, 9, 3), 14000), e(new Date(2026, 9, 14, 10), 1000)] };
    const s = safeToSpendToday(state, today)!;
    // Al empezar el día quedaban 500 − 140 = 360 € → 20 €/día; hoy ya llevas 10 €.
    expect(s.daily).toBe(2000);
    expect(s.spentToday).toBe(1000);
    expect(s.amount).toBe(1000);
    expect(s.remaining).toBe(35000);
    expect(s.over).toBe(false);
    // Mañana: 350 € entre 17 días.
    expect(s.tomorrow).toBe(Math.floor(35000 / 17));
  });

  it('nunca da negativo y avisa si te has pasado del mes', () => {
    const state = { groups: [], budgets: { comer: 10000 }, expenses: [e(new Date(2026, 9, 14, 9), 4000), e(new Date(2026, 9, 2), 8000)] };
    const s = safeToSpendToday(state, today)!;
    expect(s.amount).toBe(0);
    expect(s.over).toBe(true);
    expect(s.remaining).toBe(-2000);
  });

  it('si hoy ya gastaste lo tuyo, 0 pero no «pasado»', () => {
    const state = { groups: [], budgets: { comer: 36000 }, expenses: [e(new Date(2026, 9, 14, 9), 5000)] };
    const s = safeToSpendToday(state, today)!;
    expect(s.amount).toBe(0);
    expect(s.over).toBe(false);
  });

  it('sin presupuesto no hay cifra', () => {
    expect(safeToSpendToday({ groups: [], budgets: {}, expenses: [] }, today)).toBeNull();
  });
});

describe('monedero de efectivo', () => {
  const base = (): AppState => migrate({ ...initialState, onboarded: true });

  it('sacar del cajero sube el monedero y no cuenta como gasto', () => {
    let s = reducer(base(), { type: 'cashWithdraw', id: 'w1', amount: 5000 });
    expect(cashBalance(s)).toBe(5000);
    expect(s.expenses).toHaveLength(0);
    s = reducer(s, { type: 'addExpense', expense: e(new Date(), 1200, 'Pan', { source: 'efectivo' }) });
    s = reducer(s, { type: 'addExpense', expense: e(new Date(), 3000, 'Tarjeta') });
    expect(cashBalance(s)).toBe(3800);
    expect(cashMovements(s).map((m) => m.kind).sort()).toEqual(['in', 'out']);
  });

  it('«¿Te cuadra?» fija el saldo y solo cuenta lo de después', () => {
    let s = reducer(base(), { type: 'cashWithdraw', id: 'w1', amount: 5000, date: '2026-10-01T10:00:00.000Z' });
    s = reducer(s, { type: 'addExpense', expense: { ...e(new Date('2026-10-02T10:00:00.000Z'), 1000), source: 'efectivo' } });
    s = reducer(s, { type: 'cashAdjust', balance: 2500 });
    expect(cashBalance(s)).toBe(2500);
    s = reducer(s, { type: 'addExpense', expense: { ...e(new Date(Date.now() + 1000), 500), source: 'efectivo' } });
    expect(cashBalance(s)).toBe(2000);
  });

  it('borrar un pago en efectivo devuelve el dinero al monedero; deshacer una retirada la quita', () => {
    let s = reducer(base(), { type: 'cashWithdraw', id: 'w1', amount: 2000 });
    const pay = e(new Date(), 700, 'Café', { source: 'efectivo' });
    s = reducer(s, { type: 'addExpense', expense: pay });
    expect(cashBalance(s)).toBe(1300);
    s = reducer(s, { type: 'deleteExpense', id: pay.id });
    expect(cashBalance(s)).toBe(2000);
    s = reducer(s, { type: 'cashRemoveWithdrawal', id: 'w1' });
    expect(cashBalance(s)).toBe(0);
  });

  it('migrate limpia un monedero raro y deja sin monedero a quien no lo usa', () => {
    expect(migrate({}).cash).toBeUndefined();
    const m = migrate({ cash: { base: NaN, since: 3, withdrawals: [null, { id: 'a', amount: 100, date: '2026-10-01' }] } as never });
    expect(m.cash!.base).toBe(0);
    expect(m.cash!.withdrawals).toHaveLength(1);
  });
});

describe('calendario de recibos', () => {
  const sub = (d: Date) => e(d, 1299, 'Netflix', { category: 'suscripciones' });
  const me = { id: 'me', name: 'Yo', isMe: true };
  const flat: Group = {
    id: 'g1',
    name: 'Piso',
    emoji: '🏠',
    createdAt: '2026-01-01',
    members: [me, { id: 'ana', name: 'Ana' }],
    recurring: [{ id: 'r1', name: 'Alquiler', amount: 80000, category: 'casa', paidBy: 'ana', day: 1 }],
  };

  it('lista suscripciones y tu parte de los fijos del grupo, por fecha', () => {
    const list = upcomingCharges({ groups: [flat], expenses: [sub(new Date(2026, 7, 20)), sub(new Date(2026, 8, 20))] }, today);
    expect(list.map((c) => [c.name, c.amount, new Date(c.date).getDate()])).toEqual([
      ['Netflix', 1299, 20],
      ['Alquiler', 40000, 1],
    ]);
    expect(list[1].kind).toBe('group');
    // El alquiler del día 1 ya pasó este mes: el siguiente es el 1 de noviembre.
    expect(new Date(list[1].date).getMonth()).toBe(10);
  });

  it('los próximos 7 días y lo que quedará del mes', () => {
    const expenses = [sub(new Date(2026, 7, 18)), sub(new Date(2026, 8, 18))];
    const list = upcomingCharges({ groups: [flat], expenses }, today);
    expect(chargesWithin(list, today, 7)).toEqual({ total: 1299, count: 1 });
    // Presupuesto 1000 €, gastado 25,98 € (los dos Netflix no son de este mes) → solo resta el Netflix del 18.
    expect(leftAfterCharges({ groups: [flat], expenses, budgets: { casa: 100000 } }, list, today)).toBe(100000 - 1299);
    expect(leftAfterCharges({ groups: [flat], expenses, budgets: {} }, list, today)).toBeNull();
  });

  it('un fijo ya apuntado este mes o borrado a mano no vuelve a salir', () => {
    const early = new Date(2026, 9, 1, 8);
    const months = (st: { groups: Group[]; expenses: Expense[] }) => upcomingCharges(st, early).map((c) => new Date(c.date).getMonth());
    expect(months({ groups: [flat], expenses: [] })).toEqual([9]);
    expect(months({ groups: [{ ...flat, recurringSkipped: ['fijo-r1-2026-10'] }], expenses: [] })).toEqual([]);
    expect(months({ groups: [flat], expenses: [{ ...e(early, 80000), id: 'fijo-r1-2026-10', groupId: 'g1' }] })).toEqual([]);
  });
});

describe('revisión rápida', () => {
  const auto = (days: number, extra: Partial<Expense> = {}) => e(new Date(today.getTime() - days * 86_400_000), 500, 'Glovo', { source: 'applepay', ...extra });

  it('solo los automáticos recientes, sin revisar y sin grupo', () => {
    const list = [auto(1), auto(2, { reviewed: true }), auto(3, { groupId: 'g' }), auto(40), e(today, 100), auto(0, { source: 'notificacion' })];
    expect(reviewQueue(list, today).map((x) => x.id)).toEqual([list[5].id, list[0].id]);
  });

  it('cambiar la categoría aprende el comercio y lo marca revisado', () => {
    const x = auto(1);
    let s = reducer(migrate({ expenses: [x] }), { type: 'updateExpense', expense: { ...x, category: 'super', reviewed: true } });
    expect(s.learnedCategories.glovo).toBe('super');
    expect(reviewQueue(s.expenses, today)).toHaveLength(0);
    // Editarlo luego en «Añadir» (sin el campo) no lo vuelve a poner por revisar.
    const { reviewed: _r, ...plain } = s.expenses[0];
    s = reducer(s, { type: 'updateExpense', expense: { ...plain, amount: 600 } });
    expect(s.expenses[0].reviewed).toBe(true);
  });

  it('«Bien» lo marca revisado; editar a mano un automático también', () => {
    const a = auto(1);
    const b = auto(2);
    let s = reducer(migrate({ expenses: [a, b] }), { type: 'markReviewed', ids: [a.id] });
    expect(reviewQueue(s.expenses, today).map((x) => x.id)).toEqual([b.id]);
    s = reducer(s, { type: 'updateExpense', expense: { ...b, merchant: 'Glovo Madrid' } });
    expect(reviewQueue(s.expenses, today)).toHaveLength(0);
  });
});
