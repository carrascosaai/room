import { describe, expect, it } from 'vitest';

import { splitByItems } from '../src/domain/groups';
import { activeTrip, moveToGroup, parseQuickAdd, tripCandidates } from '../src/domain/smart';
import type { Expense, Group } from '../src/domain/types';
import { FALLBACK } from '../src/fx/fx';

const me = { id: 'me', name: 'Fernando', isMe: true };
const ana = { id: 'ana', name: 'Ana' };
const luis = { id: 'luis', name: 'Luis' };

describe('reparto por productos', () => {
  it('cada uno paga lo suyo y la propina va en proporción', () => {
    // 60 € en total: pizza 20 (yo), pasta 16 (Ana), vino 12 (los tres), 12 de propina
    const s = splitByItems(6000, [
      { name: 'Pizza', amount: 2000, who: ['me'] },
      { name: 'Pasta', amount: 1600, who: ['ana'] },
      { name: 'Vino', amount: 1200, who: ['me', 'ana', 'luis'] },
    ])!;
    expect(s.me + s.ana + s.luis).toBe(6000);
    expect(s).toEqual({ me: 3000, ana: 2500, luis: 500 });
  });

  it('rechaza productos que suman más que el total o sin nadie', () => {
    expect(splitByItems(1000, [{ name: 'X', amount: 1500, who: ['me'] }])).toBeNull();
    expect(splitByItems(1000, [{ name: 'X', amount: 500, who: [] }])).toBeNull();
  });
});

describe('modo viaje', () => {
  const trip: Group = { id: 'jp', name: 'Japón', emoji: '✈️', kind: 'trip', currency: 'JPY', trip: { start: '2026-10-08', end: '2026-10-20' }, createdAt: '', members: [me, ana] };
  const at = (d: number) => new Date(2026, 9, d, 12).toISOString();
  const yen: Expense = { id: 'y', amount: 1700, merchant: 'Lawson', category: 'super', date: at(10), source: 'applepay', original: { amount: 300000, currency: 'JPY', rate: 0.00566 } };
  const home: Expense = { id: 'h', amount: 1200, merchant: 'Netflix', category: 'suscripciones', date: at(10), source: 'applepay' };
  const after: Expense = { ...yen, id: 'late', date: at(25) };

  it('detecta el viaje activo con un día de margen', () => {
    expect(activeTrip([trip], new Date(2026, 9, 7, 20))?.id).toBe('jp');
    expect(activeTrip([trip], new Date(2026, 9, 23))).toBeUndefined();
  });

  it('propone solo los pagos en otra moneda durante el viaje', () => {
    const state = { expenses: [yen, home, after], groups: [trip], profile: { name: '', currency: 'EUR' }, tripDismissed: [] };
    expect(tripCandidates(state).map((c) => c.expenses.map((e) => e.id))).toEqual([['y']]);
    expect(tripCandidates({ ...state, tripDismissed: ['y'] })).toEqual([]);
  });

  it('al moverlo queda en yenes, pagado por mí y repartido', () => {
    const moved = moveToGroup(yen, trip, 'EUR', FALLBACK);
    expect(moved).toMatchObject({ amount: 300000, groupId: 'jp', paidBy: 'me', shares: { me: 150000, ana: 150000 } });
    expect(moved.original).toBeUndefined();
  });
});

describe('apuntar rápido', () => {
  const state = {
    groups: [
      { id: 'par', name: 'Ana y yo', emoji: '❤️', createdAt: '', members: [me, ana] },
      { id: 'piso', name: 'Piso Malasaña', emoji: '🏠', createdAt: '', members: [me, ana, luis] },
    ] as Group[],
    learnedCategories: {},
    profile: { name: '', currency: 'EUR' },
  };
  it.each([
    ['café 2,50', { amount: 250, merchant: 'Café', currency: 'EUR', daysAgo: 0 }],
    ['Mercadona 34.20', { amount: 3420, merchant: 'Mercadona', category: 'super' }],
    ['cena 45 con Ana y yo ayer', { amount: 4500, merchant: 'Cena', groupId: 'par', daysAgo: 1 }],
    ['luz 60 piso malasaña', { amount: 6000, merchant: 'Luz', groupId: 'piso' }],
    ['ramen ¥1200', { amount: 120000, currency: 'JPY', merchant: 'Ramen' }],
    ['taxi 12 yesterday', { amount: 1200, merchant: 'Taxi', daysAgo: 1 }],
    ['Kaffee 3,20 gestern', { amount: 320, merchant: 'Kaffee', daysAgo: 1 }],
  ])('%s', (text, expected) => {
    expect(parseQuickAdd(text, state)).toMatchObject(expected);
  });
  it('sin importe no hace nada', () => {
    expect(parseQuickAdd('café', state)).toBeNull();
  });
});

describe('categorías en todo el mundo', () => {
  it.each([
    ['Cena', 'comer'],
    ['Dinner with friends', 'comer'],
    ['TESCO STORES 2231', 'super'],
    ['Пятёрочка', 'super'],
    ['Магнит', 'super'],
    ['セブンイレブン', 'super'],
    ['Miete Oktober', 'casa'],
    ['Uber Eats', 'comer'],
    ['Uber', 'transporte'],
    ['Transport for London', 'transporte'],
    ['Mercado Libre', 'compras'],
    ['Walgreens #123', 'salud'],
    ['Barcelona souvenirs', 'otros'],
  ])('%s → %s', async (m, cat) => {
    const { categorize } = await import('../src/domain/categorize');
    expect(categorize(m)).toBe(cat);
  });
});
