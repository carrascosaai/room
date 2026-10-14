import { describe, expect, it } from 'vitest';

import { dueRecurring, recurringExpenseId } from '../src/domain/groupInsights';
import { splitEqually } from '../src/domain/groups';
import { parseDate } from '../src/domain/csv';
import { applySnapshot, buildPush, type GroupSnapshot } from '../src/domain/sync';
import type { AppState, Expense, Group } from '../src/domain/types';
import { FALLBACK } from '../src/fx/fx';
import { initialState, migrate, reducer } from '../src/store/store';

const fx = { ...FALLBACK, rates: { ...FALLBACK.rates, USD: 2, JPY: 100 } };

function group(over: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    name: 'Piso',
    emoji: '🏠',
    createdAt: '2026-01-01T00:00:00.000Z',
    members: [
      { id: 'me', name: 'Yo', isMe: true },
      { id: 'ana', name: 'Ana' },
    ],
    ...over,
  };
}

function base(over: Partial<AppState> = {}): AppState {
  return { ...initialState, onboarded: true, profile: { ...initialState.profile, currency: 'EUR' }, fx, ...over };
}

const exp = (over: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  amount: 1000,
  merchant: 'Súper',
  category: 'super',
  date: '2026-10-05T10:00:00.000Z',
  source: 'manual',
  groupId: 'g1',
  paidBy: 'ana',
  shares: { me: 600, ana: 400 },
  ...over,
});

describe('1. gastos fijos borrados no vuelven', () => {
  const r = { id: 'r1', name: 'Alquiler', amount: 80000, category: 'casa' as const, paidBy: 'ana', day: 1 };
  const today = new Date(2026, 9, 14);
  const fid = recurringExpenseId(r, '2026-10');

  it('deleteExpense recuerda el fijo y dueRecurring no lo recrea', () => {
    const g = group({ recurring: [r], remote: { code: 'X' } });
    let s = base({ groups: [g] });
    const due = dueRecurring(g, s.expenses, today, (a) => splitEqually(a, ['me', 'ana']));
    expect(due.map((e) => e.id)).toEqual([fid]);
    s = reducer(s, { type: 'importExpenses', expenses: due });
    s = reducer(s, { type: 'deleteExpense', id: fid });
    expect(s.groups[0].recurringSkipped).toEqual([fid]);
    expect(dueRecurring(s.groups[0], s.expenses, today, (a) => splitEqually(a, ['me', 'ana']))).toEqual([]);
    // Viaja en los ajustes del grupo.
    expect(buildPush(s, 'g1').group?.meta.recurringSkipped).toEqual([fid]);
  });

  it('applySnapshot une los fijos saltados de aquí y del servidor', () => {
    const s = base({ groups: [group({ recurring: [r], remote: { code: 'X' }, recurringSkipped: ['fijo-r1-2026-09'] })] });
    const snap: GroupSnapshot = {
      group: { id: 'g1', name: 'Piso', emoji: '🏠', code: 'X', meta: { recurringSkipped: [fid] }, updatedAt: '2026-10-10T00:00:00.000Z' },
      members: [{ id: 'me', name: 'Yo', claimed: true, updatedAt: '2026-01-01T00:00:00.000Z' }],
      expenses: [],
      settlements: [],
    };
    const out = applySnapshot(s, 'g1', snap, '2026-10-11T00:00:00.000Z');
    expect(new Set(out.groups[0].recurringSkipped)).toEqual(new Set(['fijo-r1-2026-09', fid]));
  });

  it('buildPush no manda el mismo id vivo y borrado', () => {
    const s = base({
      groups: [group({ remote: { code: 'X' } })],
      expenses: [exp()],
      settlements: [{ id: 's1', groupId: 'g1', from: 'me', to: 'ana', amount: 100, date: '2026-10-01' }],
      tombstones: [
        { kind: 'expense', id: 'e1', groupId: 'g1', deletedAt: '2026-10-01' },
        { kind: 'expense', id: 'gone', groupId: 'g1', deletedAt: '2026-10-01' },
        { kind: 'expense', id: 'gone', groupId: 'g1', deletedAt: '2026-10-02' },
        { kind: 'settlement', id: 's1', groupId: 'g1', deletedAt: '2026-10-01' },
      ],
    });
    const push = buildPush(s, 'g1');
    expect(push.expenses.filter((e) => e.id === 'e1')).toHaveLength(1);
    expect(push.expenses.find((e) => e.id === 'e1')?.deleted).toBe(false);
    expect(push.expenses.filter((e) => e.id === 'gone')).toHaveLength(1);
    expect(push.settlements).toHaveLength(1);
    expect(push.settlements[0].deleted).toBe(false);
  });
});

describe('2. mover un gasto fuera de un grupo compartido', () => {
  const g2 = { ...group({ id: 'g2', remote: { code: 'Y' } }) };

  it('a personal: borra la copia del servidor', () => {
    let s = base({ groups: [group({ remote: { code: 'X' } })], expenses: [exp()] });
    s = reducer(s, { type: 'updateExpense', expense: { ...exp(), groupId: undefined, paidBy: undefined, shares: undefined } });
    expect(s.tombstones).toMatchObject([{ kind: 'expense', id: 'e1', groupId: 'g1' }]);
    expect(s.expenses[0].id).toBe('e1');
    expect(buildPush(s, 'g1').expenses).toMatchObject([{ id: 'e1', deleted: true }]);
  });

  it('a otro grupo: nuevo id y lápida en el viejo', () => {
    let s = base({ groups: [group({ remote: { code: 'X' } }), g2], expenses: [exp()] });
    s = reducer(s, { type: 'updateExpense', expense: { ...exp(), groupId: 'g2' } });
    expect(s.expenses).toHaveLength(1);
    expect(s.expenses[0].id).not.toBe('e1');
    expect(s.expenses[0].groupId).toBe('g2');
    expect(s.tombstones).toMatchObject([{ kind: 'expense', id: 'e1', groupId: 'g1' }]);
    expect(buildPush(s, 'g2').expenses.map((e) => e.id)).toEqual([s.expenses[0].id]);
  });

  it('sin cambiar de grupo no hay lápida ni id nuevo', () => {
    let s = base({ groups: [group({ remote: { code: 'X' } })], expenses: [exp()] });
    s = reducer(s, { type: 'updateExpense', expense: { ...exp(), merchant: 'Otro' } });
    expect(s.tombstones).toEqual([]);
    expect(s.expenses[0].id).toBe('e1');
  });
});

describe('3. borrar un grupo deja solo mi parte, en mi moneda', () => {
  it('convierte mi parte y descarta lo que no era mío', () => {
    const s = base({
      groups: [group({ currency: 'USD' })],
      expenses: [exp(), exp({ id: 'e2', shares: { ana: 1000 } }), exp({ id: 'p', groupId: undefined, paidBy: undefined, shares: undefined, amount: 50 })],
    });
    const out = reducer(s, { type: 'deleteGroup', id: 'g1' });
    expect(out.expenses.map((e) => e.id).sort()).toEqual(['e1', 'p']);
    const e1 = out.expenses.find((e) => e.id === 'e1')!;
    expect(e1.amount).toBe(300); // 600 USD-cent → 300 EUR-cent (1 EUR = 2 USD)
    expect(e1.groupId).toBeUndefined();
    expect(e1.shares).toBeUndefined();
    expect(e1.original).toEqual({ amount: 600, currency: 'USD', rate: 0.5 });
  });

  it('en la misma moneda: mi parte tal cual, sin original', () => {
    const out = reducer(base({ groups: [group()], expenses: [exp()] }), { type: 'deleteGroup', id: 'g1' });
    expect(out.expenses).toHaveLength(1);
    expect(out.expenses[0].amount).toBe(600);
    expect(out.expenses[0].original).toBeUndefined();
  });
});

describe('4. cambiar la moneda del grupo convierte', () => {
  it('gastos, partes (suma exacta), pagos, fijos y presupuesto', () => {
    const s = base({
      groups: [
        group({
          currency: 'EUR',
          budget: 10000,
          recurring: [{ id: 'r', name: 'Luz', amount: 3333, category: 'casa', paidBy: 'me', day: 1 }],
        }),
      ],
      expenses: [exp({ amount: 1001, shares: { me: 334, ana: 334, x: 333 } })],
      settlements: [{ id: 's1', groupId: 'g1', from: 'me', to: 'ana', amount: 250, date: '2026-10-01' }],
    });
    const out = reducer(s, { type: 'updateGroup', groupId: 'g1', changes: { currency: 'USD', budget: 10000, name: 'Piso' } });
    const g = out.groups[0];
    expect(g.currency).toBe('USD');
    expect(g.budget).toBe(20000);
    expect(g.recurring![0].amount).toBe(6666);
    const e = out.expenses[0];
    expect(e.amount).toBe(2002);
    expect(Object.values(e.shares!).reduce((a, b) => a + b, 0)).toBe(2002);
    expect(e.original).toEqual({ amount: 1001, currency: 'EUR', rate: 2 });
    expect(out.settlements[0].amount).toBe(500);
  });

  it('un gasto pagado en la nueva moneda recupera su importe original', () => {
    const s = base({
      groups: [group({ currency: 'EUR' })],
      expenses: [exp({ amount: 500, shares: { me: 250, ana: 250 }, original: { amount: 1000, currency: 'USD', rate: 0.5 } })],
    });
    const out = reducer(s, { type: 'updateGroup', groupId: 'g1', changes: { currency: 'USD' } });
    expect(out.expenses[0].amount).toBe(1000);
    expect(out.expenses[0].original).toBeUndefined();
    expect(out.expenses[0].shares).toEqual({ me: 500, ana: 500 });
  });

  it('un presupuesto nuevo escrito a la vez se respeta', () => {
    const s = base({ groups: [group({ currency: 'EUR', budget: 10000 })] });
    const out = reducer(s, { type: 'updateGroup', groupId: 'g1', changes: { currency: 'USD', budget: 7777 } });
    expect(out.groups[0].budget).toBe(7777);
  });

  it('setCurrency fija la moneda antigua en grupos sin moneda', () => {
    const s = base({ groups: [group()], expenses: [exp()] });
    const out = reducer(s, { type: 'setCurrency', currency: 'USD' });
    expect(out.profile.currency).toBe('USD');
    expect(out.groups[0].currency).toBe('EUR');
    expect(out.expenses[0].amount).toBe(1000);
  });
});

describe('5. deshacer un pago', () => {
  const settlement = { id: 's1', groupId: 'g1', from: 'me', to: 'ana', amount: 100, date: '2026-10-01' };

  it('en grupo compartido: lo quita y deja lápida', () => {
    const out = reducer(base({ groups: [group({ remote: { code: 'X' } })], settlements: [settlement] }), { type: 'deleteSettlement', id: 's1' });
    expect(out.settlements).toEqual([]);
    expect(out.tombstones).toMatchObject([{ kind: 'settlement', id: 's1', groupId: 'g1' }]);
    expect(buildPush(out, 'g1').settlements).toMatchObject([{ id: 's1', deleted: true }]);
  });

  it('en grupo local: sin lápida', () => {
    const out = reducer(base({ groups: [group()], settlements: [settlement] }), { type: 'deleteSettlement', id: 's1' });
    expect(out.settlements).toEqual([]);
    expect(out.tombstones).toEqual([]);
  });
});

describe('6. migración, pesos y fechas', () => {
  it('hydrate rellena lo que falta', () => {
    const old = { onboarded: true, profile: { name: 'A' }, expenses: [exp()] } as unknown as AppState;
    const s = reducer(initialState, { type: 'hydrate', state: old });
    expect(s.profile.currency).toBe('EUR');
    expect(s.groups).toEqual([]);
    expect(s.tombstones).toEqual([]);
    expect(migrate(undefined).expenses).toEqual([]);
  });

  it('un miembro nuevo en un grupo con pesos recibe la media', () => {
    const s = base({ groups: [group({ weights: { me: 60, ana: 40 } })] });
    const out = reducer(s, { type: 'addMember', groupId: 'g1', member: { id: 'luis', name: 'Luis' } });
    expect(out.groups[0].weights).toEqual({ me: 60, ana: 40, luis: 50 });
  });

  it('parseDate rechaza días que no existen', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('2026-04-31')).toBeNull();
    expect(parseDate('29/02/2028')).not.toBeNull();
    expect(parseDate('31/01/2026')).not.toBeNull();
  });
});
