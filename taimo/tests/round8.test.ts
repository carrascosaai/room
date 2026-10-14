import { describe, expect, it } from 'vitest';

import { makeBackup, readBackup } from '../src/domain/backup';
import { budgetCrossings, suggestBudgets } from '../src/domain/insights';
import type { Expense } from '../src/domain/types';
import { initialState, reducer } from '../src/store/store';

let n = 0;
const e = (date: Date, amount: number, category: Expense['category']): Expense => ({
  id: `e${n++}`,
  amount,
  merchant: 'X',
  category,
  date: date.toISOString(),
  source: 'manual',
});
const today = new Date(2026, 9, 14, 12);

describe('presupuesto automático', () => {
  it('media de los meses completos, redondeada hacia arriba de 5 en 5', () => {
    const expenses = [
      e(new Date(2026, 8, 3), 21000, 'super'),
      e(new Date(2026, 7, 3), 19000, 'super'),
      e(new Date(2026, 8, 9), 4320, 'comer'),
      e(new Date(2026, 9, 2), 99999, 'ocio'), // este mes no cuenta
    ];
    const s = suggestBudgets({ groups: [], expenses }, today)!;
    expect(s.months).toBe(2);
    expect(s.budgets).toEqual({ super: 20000, comer: 2500 });
  });

  it('sin meses completos extrapola este mes a partir del día 10', () => {
    const s = suggestBudgets({ groups: [], expenses: [e(new Date(2026, 9, 3), 7000, 'super')] }, today)!;
    expect(s.months).toBe(0);
    expect(s.budgets.super).toBe(15500); // 70 € en 14 días -> 155 € en 31
    expect(suggestBudgets({ groups: [], expenses: [] }, today)).toBeNull();
    expect(suggestBudgets({ groups: [], expenses: [e(new Date(2026, 9, 3), 7000, 'super')] }, new Date(2026, 9, 5))).toBeNull();
  });
});

describe('avisos al cruzar el 80 % y el 100 %', () => {
  const base = { groups: [], budgets: { comer: 10000 }, expenses: [e(new Date(2026, 9, 2), 7000, 'comer')] };
  it('avisa una vez al cruzar cada umbral', () => {
    const near = { ...base, expenses: [...base.expenses, e(new Date(2026, 9, 10), 1500, 'comer')] };
    expect(budgetCrossings(base, near, today)).toEqual([{ category: 'comer', level: 'warning' }]);
    const over = { ...near, expenses: [...near.expenses, e(new Date(2026, 9, 11), 2000, 'comer')] };
    expect(budgetCrossings(near, over, today)).toEqual([{ category: 'comer', level: 'over' }]);
    const more = { ...over, expenses: [...over.expenses, e(new Date(2026, 9, 12), 500, 'comer')] };
    expect(budgetCrossings(over, more, today)).toEqual([]);
  });
});

describe('copia de seguridad en archivo', () => {
  it('va y vuelve sin la cuenta y rechaza archivos que no son de Taimo', () => {
    const state = reducer(initialState, { type: 'addExpense', expense: e(today, 1234, 'super') });
    const withAccount = { ...state, profile: { ...state.profile, account: { id: 'u', provider: 'apple' as const } } };
    const file = JSON.stringify(makeBackup(withAccount, today));
    const back = readBackup(file)!;
    expect(back.state.expenses).toHaveLength(1);
    expect(back.state.profile.account).toBeUndefined();
    expect(back.exportedAt).toBe(today.toISOString());
    expect(readBackup('{"app":"otra"}')).toBeNull();
    expect(readBackup('no es json')).toBeNull();
    expect(readBackup('{"app":"taimo","state":{"expenses":"x"}}')).toBeNull();
  });

  it('el bloqueo se guarda en el perfil', () => {
    expect(reducer(initialState, { type: 'setLock', lock: true }).profile.lock).toBe(true);
  });
});

describe('resumen del mes', () => {
  it('total, comparación, categoría y día más caro', async () => {
    const { monthRecap } = await import('../src/domain/insights');
    const exp = [
      { ...e(new Date(2026, 8, 3), 3000, 'super'), source: 'applepay' as const },
      e(new Date(2026, 8, 3), 2000, 'comer'),
      e(new Date(2026, 8, 20), 1500, 'super'),
      e(new Date(2026, 7, 10), 5000, 'ocio'),
    ];
    const r = monthRecap({ groups: [], budgets: { super: 10000 }, expenses: exp }, new Date(2026, 8, 15));
    expect(r).toMatchObject({ spent: 6500, previous: 5000, count: 3, auto: 1, budget: 10000, shared: 0 });
    expect(r.top).toEqual({ category: 'super', total: 4500 });
    expect(r.biggestDay?.total).toBe(5000);
    expect(r.biggestDay?.date.getDate()).toBe(3);
  });
});
