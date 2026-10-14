import { describe, expect, it } from 'vitest';

import { changePct, periodStats, rangeOf, shiftAnchor } from '../src/domain/stats';
import type { Expense } from '../src/domain/types';

const e = (date: Date, amount: number, category: Expense['category'] = 'ocio'): Expense => ({
  id: Math.random().toString(36),
  amount,
  merchant: 'X',
  category,
  date: date.toISOString(),
  source: 'manual',
});

const now = new Date(2026, 9, 14, 18, 0); // martes 14 de octubre de 2026
const state = {
  groups: [],
  expenses: [
    e(new Date(2026, 9, 14, 9, 30), 500, 'comer'),
    e(new Date(2026, 9, 14, 13, 10), 1500, 'super'),
    e(new Date(2026, 9, 13, 20, 0), 2000),
    e(new Date(2026, 9, 1, 12, 0), 1000),
    e(new Date(2026, 8, 20, 12, 0), 3000),
    e(new Date(2025, 5, 1, 12, 0), 7000),
  ],
};

describe('estadísticas por periodo', () => {
  it('la semana empieza en lunes', () => {
    const r = rangeOf('week', now);
    expect(r.start).toEqual(new Date(2026, 9, 12));
    expect(r.end).toEqual(new Date(2026, 9, 19));
  });

  it('día: 24 barras por hora', () => {
    const s = periodStats(state, 'day', now, now);
    expect(s.buckets).toHaveLength(24);
    expect(s.total).toBe(2000);
    expect(s.buckets[9].total).toBe(500);
    expect(s.buckets[13].total).toBe(1500);
    // Hoy va por las 18:00: se compara con ayer hasta las 18:00 (el gasto de las 20:00 no cuenta).
    expect(s.partial).toBe(true);
    expect(s.previousTotal).toBe(0);
    expect(changePct(s.total, s.previousTotal)).toBeNull();
  });

  it('semana: 7 días', () => {
    const s = periodStats(state, 'week', now, now);
    expect(s.buckets.map((b) => b.total)).toEqual([0, 2000, 2000, 0, 0, 0, 0]);
  });

  it('mes: un tramo por día, categorías ordenadas y los más grandes', () => {
    const s = periodStats(state, 'month', now, now);
    expect(s.buckets).toHaveLength(31);
    expect(s.total).toBe(5000);
    // Del 1 al 14 de octubre contra del 1 al 14 de septiembre: el gasto del 20 de septiembre no cuenta.
    expect(s.previousTotal).toBe(0);
    const withEarly = { ...state, expenses: [...state.expenses, e(new Date(2026, 8, 3, 12), 2500)] };
    const s2 = periodStats(withEarly, 'month', now, now);
    expect(s2.previousTotal).toBe(2500);
    expect(changePct(s2.total, s2.previousTotal)).toBe(100);
    // Un mes ya cerrado se compara entero con el anterior.
    const sept = periodStats(withEarly, 'month', new Date(2026, 8, 10), now);
    expect(sept.partial).toBe(false);
    expect(sept.total).toBe(5500);
    expect(s.byCategory.map((c) => c.category)).toEqual(['ocio', 'super', 'comer']);
    expect(s.biggest[0].amount).toBe(2000);
    expect(s.days).toBe(14); // la media cuenta solo los días que han pasado
  });

  it('año: 12 meses; todo: un tramo por año desde el primer gasto', () => {
    const y = periodStats(state, 'year', now, now);
    expect(y.buckets).toHaveLength(12);
    expect(y.buckets[8].total).toBe(3000);
    expect(y.buckets[9].total).toBe(5000);
    const all = periodStats(state, 'all', now, now);
    expect(all.buckets.map((b) => b.start.getFullYear())).toEqual([2025, 2026]);
    expect(all.buckets.map((b) => b.total)).toEqual([7000, 8000]);
    expect(all.previousTotal).toBeNull();
  });

  it('navega hacia atrás y adelante', () => {
    expect(shiftAnchor('month', now, -1)).toEqual(new Date(2026, 8, 1));
    expect(shiftAnchor('year', now, -1)).toEqual(new Date(2025, 0, 1));
    expect(shiftAnchor('day', now, -1).getDate()).toBe(13);
  });
});
