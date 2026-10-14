import { describe, expect, it } from 'vitest';

import { findMoneyBack, recoveredTotal, urgentMoneyBack } from '../src/domain/moneyback';
import type { CategoryId, Expense } from '../src/domain/types';
import { initialState, reducer } from '../src/store/store';

let n = 0;
const ex = (merchant: string, amount: number, date: string, category: CategoryId = 'compras', extra: Partial<Expense> = {}): Expense => ({
  id: `e${++n}`, amount, merchant, category, date, source: 'applepay', ...extra,
});
const today = new Date('2026-10-14T12:00:00');
const kinds = (list: { kind: string }[]) => list.map((m) => m.kind);

describe('Taimo te devuelve dinero', () => {
  it('encuentra un cobro repetido el mismo día', () => {
    const r = findMoneyBack({ expenses: [ex('MERCADONA', 4290, '2026-10-13T10:00:00', 'super'), ex('Mercadona', 4290, '2026-10-13T18:00:00', 'super'), ex('Mercadona', 4290, '2026-10-10T18:00:00', 'super')] }, today);
    expect(kinds(r)).toEqual(['double']);
    expect(r[0].amount).toBe(4290);
  });

  it('avisa de una suscripción que sube de precio, con lo que cuesta al año', () => {
    const exps = ['2026-07-03', '2026-08-03', '2026-09-03', '2026-10-03'].map((d, i) => ex('Netflix', i < 3 ? 1399 : 1599, `${d}T09:00:00`, 'suscripciones'));
    const r = findMoneyBack({ expenses: exps }, today);
    expect(r.find((m) => m.kind === 'priceUp')).toMatchObject({ before: 1399, now: 1599, amount: 2400 });
  });

  it('avisa del primer cobro de una suscripción (¿prueba gratis?)', () => {
    const r = findMoneyBack({ expenses: [ex('Disney Plus', 999, '2026-10-12T09:00:00', 'suscripciones')] }, today);
    expect(r[0]).toMatchObject({ kind: 'newSub', amount: 999 * 12 });
  });

  it('recuerda el plazo para devolver solo cuando queda poco', () => {
    const r = findMoneyBack({ expenses: [ex('ZARA', 4999, '2026-09-17T12:00:00'), ex('Zara', 3999, '2026-10-10T12:00:00'), ex('Primark', 900, '2026-09-20T12:00:00')] }, today);
    const ret = r.filter((m) => m.kind === 'returnWindow');
    expect(ret).toHaveLength(1);
    expect(ret[0]).toMatchObject({ amount: 4999, until: '2026-10-17' });
  });

  it('garantía de 3 años en aparatos y reclamación de vuelos', () => {
    const r = findMoneyBack({ expenses: [ex('MediaMarkt Getafe', 59900, '2025-03-01T12:00:00'), ex('RYANAIR', 8900, '2025-07-01T12:00:00', 'transporte'), ex('Ryanair', 900, '2023-07-01T12:00:00', 'comer')] }, today);
    expect(r.find((m) => m.kind === 'warranty')).toMatchObject({ until: '2028-03-01' });
    expect(r.filter((m) => m.kind === 'flight')).toHaveLength(1);
    expect(urgentMoneyBack(r)).toHaveLength(0);
  });

  it('lo descartado o recuperado desaparece y suma al contador', () => {
    let state = { ...initialState, expenses: [ex('Fnac', 2500, '2026-10-12T10:00:00'), ex('FNAC', 2500, '2026-10-12T11:00:00')] };
    const [item] = findMoneyBack(state, today);
    state = reducer(state, { type: 'moneyBackRecovered', id: item.id, amount: item.amount });
    expect(findMoneyBack(state, today).filter((m) => m.kind === 'double')).toHaveLength(0);
    expect(recoveredTotal(state, today)).toEqual({ total: 2500, thisYear: 2500 });
  });
});
