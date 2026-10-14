import { describe, expect, it } from 'vitest';

import { dailyStreak, evaluateChallenge, type Challenge } from '../src/domain/challenges';
import type { Expense } from '../src/domain/types';

let n = 0;
const e = (d: number, amount: number, category: Expense['category'] = 'super', h = 12): Expense => ({
  id: `c${n++}`,
  amount,
  merchant: 'X',
  category,
  date: new Date(2026, 9, d, h).toISOString(),
  source: 'manual',
});
const at = (d: number, h = 18) => new Date(2026, 9, d, h);
const base = { groups: [] };

describe('retos', () => {
  const noFood: Challenge = { id: 'a', kind: 'noCategory', category: 'comer', start: '2026-10-10', days: 7 };
  it('semana sin comer fuera: en marcha, ganado o perdido', () => {
    const ok = { ...base, expenses: [e(11, 3000, 'super')] };
    expect(evaluateChallenge(noFood, ok, at(12))).toMatchObject({ status: 'active', day: 3 });
    expect(evaluateChallenge(noFood, ok, at(18))).toMatchObject({ status: 'won' });
    expect(evaluateChallenge(noFood, { ...base, expenses: [e(13, 1200, 'comer')] }, at(14)).status).toBe('failed');
    // Un gasto en comer fuera antes de empezar no cuenta
    expect(evaluateChallenge(noFood, { ...base, expenses: [e(9, 1200, 'comer')] }, at(14)).status).toBe('active');
  });

  it('gastar menos que la semana pasada', () => {
    const ch: Challenge = { id: 'b', kind: 'lessThanLastWeek', start: '2026-10-08', days: 7 };
    const exp = [e(3, 10000), e(9, 4000)];
    expect(evaluateChallenge(ch, { ...base, expenses: exp }, at(12))).toMatchObject({ status: 'active', spent: 4000, target: 10000 });
    expect(evaluateChallenge(ch, { ...base, expenses: [...exp, e(10, 7000)] }, at(12)).status).toBe('failed');
    expect(evaluateChallenge(ch, { ...base, expenses: exp }, at(16)).status).toBe('won');
  });

  it('3 días sin gastar en una semana', () => {
    const ch: Challenge = { id: 'c', kind: 'noSpendDays', start: '2026-10-08', days: 7 };
    const exp = [e(8, 100), e(10, 100)];
    // días 9 y 11 sin gastos (hoy 12 aún no cuenta)
    expect(evaluateChallenge(ch, { ...base, expenses: exp }, at(12))).toMatchObject({ status: 'active', count: 2 });
    expect(evaluateChallenge(ch, { ...base, expenses: exp }, at(13, 9))).toMatchObject({ status: 'won', count: 3 });
    const busy = [8, 9, 10, 11, 12, 13].map((d) => e(d, 100));
    expect(evaluateChallenge(ch, { ...base, expenses: busy }, at(13)).status).toBe('failed');
  });
});

describe('racha', () => {
  it('días seguidos sin pasar del límite diario (31 € al día con 961 € al mes)', () => {
    const budgets = { super: 96100 };
    const exp = [e(1, 1000), e(10, 9000), e(11, 2000), e(12, 500), e(13, 3000)];
    expect(dailyStreak({ ...base, budgets, expenses: exp }, at(13))).toBe(3); // 11, 12 y 13
    // Si hoy te has pasado, cuenta hasta ayer
    expect(dailyStreak({ ...base, budgets, expenses: [...exp, e(14, 5000)] }, at(14))).toBe(3);
  });
});
