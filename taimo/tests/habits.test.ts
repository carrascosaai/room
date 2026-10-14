import { describe, expect, it } from 'vitest';

import { achievements, heatLevel, hourlyRate, impulseSavings, monthHeatmap, smallHabits, wishReadyAt, workMinutes } from '../src/domain/habits';
import type { AppState, Expense } from '../src/domain/types';
import { initialState } from '../src/store/store';

let n = 0;
const e = (d: number, amount: number, merchant = 'X', category: Expense['category'] = 'comer', m = 9): Expense => ({
  id: `h${n++}`,
  amount,
  merchant,
  category,
  date: new Date(2026, m, d, 9).toISOString(),
  source: 'manual',
});
const today = new Date(2026, 9, 28, 20);

describe('horas de trabajo', () => {
  it('1.600 € al mes a 40 h/semana ≈ 9,23 €/h', () => {
    const rate = hourlyRate({ monthly: 160000, hoursPerWeek: 40 })!;
    expect(Math.round(rate)).toBe(923);
    expect(workMinutes(450, rate)).toBe(29); // un café de 4,50 €
    expect(workMinutes(4500, rate)).toBe(295); // una cena de 45 € ≈ 4 h 55 min
    expect(hourlyRate(undefined)).toBeNull();
  });
});

describe('gastos hormiga', () => {
  it('cafés pequeños y repetidos, no la compra grande', () => {
    const exp = [...[1, 3, 5, 8, 10, 12, 15, 17].map((d) => e(d, 150, 'Café Bar Pepe')), e(9, 6400, 'Mercadona', 'super'), e(4, 300, 'Kiosko')];
    const h = smallHabits({ groups: [], expenses: exp }, today);
    expect(h).toEqual([{ label: 'Café Bar Pepe', category: 'comer', count: 8, monthly: 1200, average: 150 }]);
  });
});

describe('lista de deseos', () => {
  it('48 horas de espera y ahorro por caprichos evitados', () => {
    const w = { id: 'w', name: 'Zapatillas', amount: 12000, createdAt: new Date(2026, 9, 1, 10).toISOString() };
    expect(wishReadyAt(w).getDate()).toBe(3);
    expect(impulseSavings([{ ...w, outcome: 'skipped' }, { ...w, id: 'x', outcome: 'bought' }])).toEqual({ total: 12000, count: 1 });
  });
});

describe('mapa del mes', () => {
  it('suma por día y escalones de color', () => {
    const h = monthHeatmap({ groups: [], expenses: [e(1, 1000), e(1, 500), e(20, 6000)] }, today);
    expect(h.days[0]).toBe(1500);
    expect(h.max).toBe(6000);
    expect(h.firstWeekday).toBe(3); // 1 oct 2026 es jueves
    expect([heatLevel(0, 6000), heatLevel(1500, 6000), heatLevel(6000, 6000)]).toEqual([0, 1, 4]);
  });
});

describe('logros', () => {
  it('se calculan con tus datos', () => {
    const state: AppState = {
      ...initialState,
      budgets: { comer: 30000 },
      expenses: [e(5, 2000, 'Bar', 'comer', 8), { ...e(10, 500), source: 'applepay' }],
      wishes: [{ id: 'w', name: 'X', amount: 100, createdAt: '', outcome: 'skipped' }],
    };
    const got = achievements(state, today);
    expect([...got].sort()).toEqual(['auto', 'first', 'impulse', 'monthUnder', 'streak30', 'streak7', 'weekUnder'].sort());
  });
});
