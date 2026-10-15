import { describe, expect, it } from 'vitest';

import { canSpend, goalProgress, jarBalances, nextPayday, paydays, rebaseKid, sanitizeKids, splitAmount, type Kid } from '../src/domain/allowance';
import { categoryStatus, monthSummary, rolloverCarry } from '../src/domain/budget';
import { activityStreak } from '../src/domain/challenges';
import { expectedLeftover, monthForecast } from '../src/domain/insights';
import { rolloverRows, withRollover } from '../src/domain/rollover';
import { yearRecap } from '../src/domain/yearRecap';
import type { AppState, Expense } from '../src/domain/types';
import { migrate, reducer } from '../src/store/store';

let n = 0;
const e = (y: number, m: number, d: number, amount: number, category: Expense['category'] = 'comer', merchant = 'Bar'): Expense => ({
  id: `f${n++}`,
  amount,
  merchant,
  category,
  date: new Date(y, m - 1, d, 12).toISOString(),
  source: 'manual',
});

describe('sobrante (rollover)', () => {
  const base = { groups: [], budgets: { comer: 10000, super: 20000 } };

  it('sin activarlo no cambia nada', () => {
    const s = { ...base, expenses: [e(2026, 9, 5, 4000)] };
    expect(rolloverCarry(s, new Date(2026, 9, 10))).toEqual({});
    expect(categoryStatus(s, 'comer', new Date(2026, 9, 10))).toMatchObject({ budget: 10000, carry: 0 });
  });

  it('lo que sobra pasa al mes siguiente y se acumula', () => {
    const s = { ...base, rollover: { comer: '2026-08' }, expenses: [e(2026, 8, 5, 7000), e(2026, 9, 5, 4000), e(2026, 10, 2, 1000)] };
    const today = new Date(2026, 9, 10);
    // agosto: sobran 30 · septiembre: sobran 60 → 90
    expect(rolloverCarry(s, today)).toEqual({ comer: 9000 });
    const st = categoryStatus(s, 'comer', today);
    expect(st).toMatchObject({ budget: 19000, carry: 9000, spent: 1000, remaining: 18000 });
    const sum = monthSummary(s, today);
    expect(sum.budget).toBe(39000);
    expect(sum.carry).toBe(9000);
    // Lo de super no cambia
    expect(categoryStatus(s, 'super', today)).toMatchObject({ budget: 20000, carry: 0 });
  });

  it('pasarse resta, pero como mucho la mitad del límite', () => {
    const s = { ...base, rollover: { comer: '2026-09' }, expenses: [e(2026, 9, 5, 13000)] };
    expect(rolloverCarry(s, new Date(2026, 9, 10))).toEqual({ comer: -3000 });
    const big = { ...base, rollover: { comer: '2026-09' }, expenses: [e(2026, 9, 5, 50000)] };
    expect(rolloverCarry(big, new Date(2026, 9, 10))).toEqual({ comer: -5000 });
    expect(categoryStatus(big, 'comer', new Date(2026, 9, 10)).budget).toBe(5000);
  });

  it('al activarlo empieza este mes (nada cambia de golpe) y se puede quitar', () => {
    const r = withRollover(undefined, 'comer', true, new Date(2026, 9, 15));
    expect(r).toEqual({ comer: '2026-10' });
    const s = { ...base, rollover: r, expenses: [e(2026, 9, 5, 1000)] };
    expect(rolloverCarry(s, new Date(2026, 9, 20))).toEqual({ comer: 0 });
    expect(rolloverCarry(s, new Date(2026, 10, 2))).toEqual({ comer: 10000 });
    expect(withRollover(r, 'comer', false)).toBeUndefined();
    const rows = rolloverRows(s, new Date(2026, 10, 2));
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { category: 'super', budget: 20000, on: false, carry: 0 },
        { category: 'comer', budget: 10000, on: true, carry: 10000 },
      ]),
    );
  });

  it('la hucha a una meta no cuenta lo que ya pasa al mes siguiente', () => {
    const plain = { ...base, expenses: [e(2026, 10, 2, 3000, 'super')] };
    const today = new Date(2026, 9, 15);
    const without = expectedLeftover(monthForecast(plain, today));
    const withRoll = expectedLeftover(monthForecast({ ...plain, rollover: { comer: '2026-10' } }, today));
    expect(without).toBeGreaterThan(withRoll);
    expect(withRoll).toBeGreaterThan(0);
  });

  it('el reducer activa y quita', () => {
    let s = migrate({ budgets: { comer: 100 } });
    s = reducer(s, { type: 'setRollover', category: 'comer', on: true });
    expect(s.rollover?.comer).toMatch(/^\d{4}-\d{2}$/);
    s = reducer(s, { type: 'setRollover', category: 'comer', on: false });
    expect(s.rollover).toBeUndefined();
  });
});

describe('racha con comodín', () => {
  const day = (d: number) => e(2026, 10, d, 500);
  const at = (d: number) => new Date(2026, 9, d, 18);

  it('cuenta días seguidos y hoy suma si ya apuntaste', () => {
    const s = { expenses: [day(10), day(11), day(12)] };
    expect(activityStreak(s, at(12))).toMatchObject({ days: 3, today: true, freezes: 1 });
    // Hoy sin apuntar aún no rompe nada
    expect(activityStreak(s, at(13))).toMatchObject({ days: 3, today: false });
  });

  it('un día olvidado lo salva el comodín de la semana', () => {
    // 2026-10-12 es lunes. Falta el 14 (miércoles).
    const s = { expenses: [day(12), day(13), day(15), day(16)] };
    const r = activityStreak(s, at(16));
    expect(r.days).toBe(4);
    expect(r.saved).toEqual(['2026-10-14']);
    expect(r.freezes).toBe(0);
  });

  it('dos días olvidados en la misma semana rompen la racha', () => {
    const s = { expenses: [day(12), day(14), day(16), day(17)] };
    // 13 lo salva el comodín, 15 rompe; queda 16-17
    expect(activityStreak(s, at(17)).days).toBe(2);
  });

  it('el comodín vuelve cada lunes', () => {
    // Falta el 9 (viernes, semana del 5) y el 14 (miércoles, semana del 12)
    const s = { expenses: [day(7), day(8), day(10), day(11), day(12), day(13), day(15)] };
    const r = activityStreak(s, at(15));
    expect(r.days).toBe(7);
    expect(r.saved).toEqual(['2026-10-09', '2026-10-14']);
  });

  it('«hoy no he gastado nada» cuenta', () => {
    const s = { expenses: [day(10)], checkins: ['2026-10-11', '2026-10-12'] };
    expect(activityStreak(s, at(12)).days).toBe(3);
    let st = migrate({});
    st = reducer(st, { type: 'checkIn', day: '2026-10-12' });
    st = reducer(st, { type: 'checkIn', day: '2026-10-12' });
    expect(st.checkins).toEqual(['2026-10-12']);
  });

  it('sin nada apuntado: 0 días', () => {
    expect(activityStreak({ expenses: [] }, at(12))).toMatchObject({ days: 0, best: 0, freezes: 1 });
  });
});

describe('paga para niños', () => {
  // 2026-10-03 es sábado (6)
  const kid: Kid = { id: 'k', name: 'Lucía', emoji: '🦄', amount: 1000, weekday: 6, split: { spend: 70, save: 20, give: 10 }, start: '2026-10-01', moves: [] };

  it('cuenta las pagas desde el inicio', () => {
    expect(paydays(kid, new Date(2026, 9, 2))).toBe(0);
    expect(paydays(kid, new Date(2026, 9, 3))).toBe(1);
    expect(paydays(kid, new Date(2026, 9, 16))).toBe(2);
    expect(paydays(kid, new Date(2026, 9, 17))).toBe(3);
    expect(nextPayday(kid, new Date(2026, 9, 17)).getDate()).toBe(24);
    expect(nextPayday(kid, new Date(2026, 9, 15)).getDate()).toBe(17);
  });

  it('reparte en tres huchas y resta lo gastado', () => {
    expect(splitAmount(1000, kid.split)).toEqual({ spend: 700, save: 200, give: 100 });
    expect(splitAmount(333, { spend: 70, save: 20, give: 10 })).toEqual({ spend: 233, save: 67, give: 33 });
    const k = { ...kid, moves: [{ id: 'm', jar: 'spend' as const, amount: -500, date: new Date(2026, 9, 10).toISOString() }] };
    expect(jarBalances(k, new Date(2026, 9, 17))).toEqual({ spend: 1600, save: 600, give: 300 });
    expect(canSpend(k, 'spend', 1600, new Date(2026, 9, 17))).toBe(true);
    expect(canSpend(k, 'spend', 1601, new Date(2026, 9, 17))).toBe(false);
  });

  it('meta de ahorro con semanas que faltan', () => {
    const k = { ...kid, goal: { name: 'Bici', target: 2000 } };
    expect(goalProgress(k, new Date(2026, 9, 17))).toMatchObject({ saved: 600, progress: 0.3, weeks: 7 });
  });

  it('cambiar la paga no toca lo ya cobrado', () => {
    const today = new Date(2026, 9, 17);
    const changed = rebaseKid(kid, { amount: 2000, weekday: undefined }, today, () => 'x');
    expect(changed.weekday).toBe(6);
    expect(changed.start).toBe('2026-10-18');
    expect(jarBalances(changed, today)).toEqual(jarBalances(kid, today));
    expect(jarBalances(changed, new Date(2026, 9, 24)).spend).toBe(2100 + 1400);
    // Cambiar solo el nombre no rehace nada
    expect(rebaseKid(kid, {}, today)).toEqual(kid);
  });

  it('reducer y migración', () => {
    let s: AppState = migrate({});
    s = reducer(s, { type: 'addKid', kid });
    s = reducer(s, { type: 'kidMove', kidId: 'k', move: { id: 'g', jar: 'save', amount: 500, date: new Date(2026, 9, 5).toISOString(), note: '🎂' } });
    expect(jarBalances(s.kids![0], new Date(2026, 9, 5)).save).toBe(700);
    s = reducer(s, { type: 'removeKidMove', kidId: 'k', moveId: 'g' });
    expect(s.kids![0].moves).toEqual([]);
    s = reducer(s, { type: 'updateKid', id: 'k', changes: { name: 'Lu', goal: { name: 'Bici', target: 5000 } } });
    expect(s.kids![0]).toMatchObject({ name: 'Lu', amount: 1000, start: '2026-10-01', goal: { target: 5000 } });
    s = reducer(s, { type: 'deleteKid', id: 'k' });
    expect(s.kids).toEqual([]);
    expect(migrate({}).kids).toBeUndefined();
    expect(sanitizeKids([{ id: 'a', name: 'A', start: '2026-01-01', split: { spend: 90, save: 20, give: 0 }, moves: [{ jar: 'nope' }] }, null])).toEqual([
      { id: 'a', name: 'A', emoji: '🧒', amount: 0, weekday: 6, split: { spend: 70, save: 20, give: 10 }, start: '2026-01-01', moves: [], goal: undefined },
    ]);
  });
});

describe('tu año en Taimo', () => {
  it('suma el año, categoría y comercio top, mejor mes, recuperado, racha y mesas', () => {
    const expenses: Expense[] = [
      e(2026, 1, 10, 5000, 'super', 'Mercadona'),
      e(2026, 1, 11, 2000, 'super', 'Mercadona'),
      e(2026, 2, 3, 30000, 'casa', 'Ikea'),
      e(2026, 2, 4, 1000, 'super', 'MERCADONA'),
      e(2026, 3, 4, 1000, 'comer', 'Bar'),
      e(2025, 12, 31, 99999, 'ocio', 'Old'),
    ];
    const state = {
      groups: [
        { id: 'g', name: 'Mesa', emoji: '🍽️', members: [], createdAt: '2026-05-01T00:00:00Z', table: { id: 't', m: 'Bar', c: 'EUR', t: 'Yo', p: {}, i: [], n: 3, d: '2026-05-01' } },
      ],
      budgets: { super: 10000 },
      expenses,
      moneyBack: { dismissed: [], recovered: [{ id: 'x', amount: 1500, date: '2026-04-01T00:00:00Z' }, { id: 'y', amount: 900, date: '2025-04-01T00:00:00Z' }] },
    };
    const r = yearRecap(state, 2026, new Date(2026, 9, 15));
    expect(r.partial).toBe(true);
    expect(r.spent).toBe(39000);
    expect(r.count).toBe(5);
    expect(r.top).toEqual({ category: 'casa', total: 30000 });
    expect(r.merchant).toMatchObject({ name: 'Mercadona', count: 3 });
    expect(r.bestMonth?.month.getMonth()).toBe(2); // marzo: el que más sobró
    expect(r.recovered).toBe(1500);
    expect(r.days).toBe(5);
    expect(r.bestStreak).toBe(2);
    expect(r.tables).toBe(1);
  });

  it('un año vacío no rompe nada', () => {
    const r = yearRecap({ groups: [], budgets: {}, expenses: [] }, 2026, new Date(2026, 11, 1));
    expect(r).toMatchObject({ spent: 0, top: null, merchant: null, bestMonth: null, days: 0, tables: 0 });
  });
});
