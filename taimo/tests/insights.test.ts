import { describe, expect, it } from 'vitest';

import { categoryTrend, detectSubscriptions, expectedLeftover, goalPerMonth, matchesSearch, monthForecast } from '../src/domain/insights';
import { initialState, reducer } from '../src/store/store';
import type { Expense } from '../src/domain/types';
import { handle, paymentLines } from '../src/ui/messages';

let n = 0;
const e = (date: Date, amount: number, merchant: string, category: Expense['category'] = 'ocio', extra: Partial<Expense> = {}): Expense => ({
  id: `x${n++}`,
  amount,
  merchant,
  category,
  date: date.toISOString(),
  source: 'manual',
  ...extra,
});
const today = new Date(2026, 9, 14, 18);

describe('previsión de fin de mes', () => {
  it('proyecta el gasto variable y cuenta los fijos una vez', () => {
    const state = {
      groups: [],
      budgets: { comer: 50000 },
      expenses: [e(new Date(2026, 9, 1), 70000, 'Alquiler', 'casa'), e(new Date(2026, 9, 7), 14000, 'Cena', 'comer')],
    };
    const f = monthForecast(state, today)!;
    expect(f.spent).toBe(84000);
    // 14000 en 14 días = 1000/día × 31 días + 70000 de alquiler
    expect(f.projected).toBe(101000);
    expect(f.budget).toBe(50000);
  });

  it('antes del día 5 no adivina', () => {
    expect(monthForecast({ groups: [], budgets: {}, expenses: [e(new Date(2026, 9, 2), 100, 'X')] }, new Date(2026, 9, 3))).toBeNull();
  });
});

describe('categoría que se dispara', () => {
  it('compara con lo que sueles llevar el mismo día del mes', () => {
    const expenses = [
      e(new Date(2026, 9, 10), 9000, 'Bar', 'comer'),
      e(new Date(2026, 8, 10), 3000, 'Bar', 'comer'),
      e(new Date(2026, 8, 25), 20000, 'Bar', 'comer'), // después del día 14: no cuenta
      e(new Date(2026, 7, 5), 3000, 'Bar', 'comer'),
      e(new Date(2026, 9, 3), 2000, 'Lidl', 'super'),
      e(new Date(2026, 8, 3), 2000, 'Lidl', 'super'),
    ];
    const t = categoryTrend({ groups: [], expenses }, today)!;
    expect(t.category).toBe('comer');
    expect(t.usual).toBe(3000);
    expect(t.pct).toBe(200);
  });

  it('sin historial no dice nada', () => {
    expect(categoryTrend({ groups: [], expenses: [e(new Date(2026, 9, 10), 9000, 'Bar', 'comer')] }, today)).toBeNull();
  });
});

describe('suscripciones', () => {
  it('encuentra cobros mensuales parecidos y descarta el súper', () => {
    const expenses = [
      e(new Date(2026, 7, 5), 1299, 'NETFLIX.COM'),
      e(new Date(2026, 8, 5), 1299, 'Netflix.com'),
      e(new Date(2026, 9, 5), 1399, 'Netflix.com'),
      e(new Date(2026, 8, 12), 1099, 'Spotify'),
      e(new Date(2026, 9, 12), 1099, 'Spotify'),
      // súper: varias veces al mes
      ...[1, 8, 15, 22].flatMap((d) => [e(new Date(2026, 8, d), 3000, 'Mercadona', 'super'), e(new Date(2026, 7, d), 3000, 'Mercadona', 'super')]),
      // importes muy distintos
      e(new Date(2026, 8, 2), 1000, 'Amazon'),
      e(new Date(2026, 9, 2), 8000, 'Amazon'),
      // pizza una vez al mes, pero en días distintos: no es una suscripción
      e(new Date(2026, 8, 3), 2500, 'Telepizza', 'comer'),
      e(new Date(2026, 9, 18 - 7), 2600, 'Telepizza', 'comer'),
      // ya no se cobra
      e(new Date(2026, 4, 1), 999, 'HBO'),
      e(new Date(2026, 5, 1), 999, 'HBO'),
      // gasto de grupo: no es tuyo
      e(new Date(2026, 8, 1), 500, 'Gym', 'deporte', { groupId: 'g' }),
      e(new Date(2026, 9, 1), 500, 'Gym', 'deporte', { groupId: 'g' }),
    ];
    const subs = detectSubscriptions(expenses, today);
    expect(subs.map((s) => [s.merchant, s.monthly])).toEqual([
      ['Netflix.com', 1299],
      ['Spotify', 1099],
    ]);
  });
});

describe('buscador', () => {
  it('sin tildes ni mayúsculas, por comercio, nota o categoría', () => {
    const x = e(today, 100, 'Café Málaga', 'comer', { note: 'con Ana' });
    const cat = () => 'Comer fuera';
    expect(matchesSearch(x, 'cafe', cat)).toBe(true);
    expect(matchesSearch(x, 'MALAGA ana', cat)).toBe(true);
    expect(matchesSearch(x, 'comer', cat)).toBe(true);
    expect(matchesSearch(x, 'pizza', cat)).toBe(false);
  });
});

describe('cómo te pagan', () => {
  it('limpia usuarios y crea enlaces con el importe', () => {
    expect(handle('https://www.paypal.me/ana/10')).toBe('ana');
    expect(handle('@fer')).toBe('fer');
    expect(paymentLines({ bizum: '600111222', iban: 'es9121000418450200051332', paypal: 'paypal.me/fer', revolut: '@fer' }, 1250, 'EUR')).toEqual([
      'Bizum: 600111222',
      'IBAN: ES91 2100 0418 4502 0005 1332',
      'PayPal: https://paypal.me/fer/12.50EUR',
      'Revolut: https://revolut.me/fer',
    ]);
    expect(paymentLines(undefined, 100, 'EUR')).toEqual([]);
  });
});

describe('metas de ahorro', () => {
  const goal = { id: 'g', name: 'Japón', emoji: '✈️', target: 300000, saved: 60000, deadline: '2027-04-14', createdAt: '2026-10-01' };
  it('reparte lo que falta entre los meses que quedan', () => {
    expect(goalPerMonth(goal, today)).toBe(40000); // 2400 € en 6 meses
    expect(goalPerMonth({ ...goal, deadline: undefined }, today)).toBeNull();
    expect(goalPerMonth({ ...goal, saved: 300000 }, today)).toBeNull();
  });

  it('propone apartar lo que va a sobrar, redondeado', () => {
    expect(expectedLeftover({ spent: 0, projected: 52340, budget: 64000 })).toBe(11500);
    expect(expectedLeftover({ spent: 0, projected: 63500, budget: 64000 })).toBe(0);
    expect(expectedLeftover({ spent: 0, projected: 100, budget: 0 })).toBe(0);
    expect(expectedLeftover(null)).toBe(0);
  });

  it('el reductor aparta, saca sin bajar de cero y recuerda el mes', () => {
    let s = reducer(initialState, { type: 'addGoal', goal: { ...goal, saved: 0 } });
    s = reducer(s, { type: 'saveToGoal', id: 'g', amount: 5000, leftoverMonth: '2026-10' });
    expect(s.goals![0].saved).toBe(5000);
    expect(s.leftoverMonth).toBe('2026-10');
    s = reducer(s, { type: 'saveToGoal', id: 'g', amount: -9000 });
    expect(s.goals![0].saved).toBe(0);
    s = reducer(s, { type: 'deleteGoal', id: 'g' });
    expect(s.goals).toEqual([]);
  });
});
