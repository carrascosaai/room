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
    const r = findMoneyBack({ expenses: [ex('MERCADONA', 4290, '2026-10-13T10:00:00', 'super'), ex('Mercadona', 4290, '2026-10-13T10:04:00', 'super'), ex('Mercadona', 4290, '2026-10-10T18:00:00', 'super')] }, today);
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
    const r = findMoneyBack({ expenses: [ex('MediaMarkt Getafe', 59900, '2025-03-01T12:00:00'), ex('RYANAIR', 8900, '2026-07-01T12:00:00', 'transporte'), ex('Ryanair', 900, '2023-07-01T12:00:00', 'comer')] }, today);
    expect(r.find((m) => m.kind === 'warranty')).toMatchObject({ until: '2028-03-01' });
    expect(r.filter((m) => m.kind === 'flight')).toHaveLength(1);
    expect(urgentMoneyBack(r)).toHaveLength(0);
  });

  it('lo descartado o recuperado desaparece y suma al contador', () => {
    let state = { ...initialState, expenses: [ex('Fnac', 2500, '2026-10-12T10:00:00'), ex('FNAC', 2500, '2026-10-12T10:03:00')] };
    const [item] = findMoneyBack(state, today);
    state = reducer(state, { type: 'moneyBackRecovered', id: item.id, amount: item.amount });
    expect(findMoneyBack(state, today).filter((m) => m.kind === 'double')).toHaveLength(0);
    expect(recoveredTotal(state, today)).toEqual({ total: 2500, thisYear: 2500 });
  });

  it('cobros repetidos: no en transporte ni ocio, y solo si son casi a la vez', () => {
    const r = findMoneyBack({
      expenses: [
        ex('Renfe', 1250, '2026-10-13T08:00:00', 'transporte'),
        ex('Renfe', 1250, '2026-10-13T08:02:00', 'transporte'),
        ex('Cines Yelmo', 1800, '2026-10-13T20:00:00', 'ocio'),
        ex('Cines Yelmo', 1800, '2026-10-13T20:01:00', 'ocio'),
        // Dos comidas iguales, mañana y tarde: dos compras.
        ex('Rodilla', 1100, '2026-10-12T09:00:00', 'comer'),
        ex('Rodilla', 1100, '2026-10-12T14:30:00', 'comer'),
        // Del extracto (sin hora de verdad): basta con el mismo día.
        ex('Decathlon', 3500, '2026-10-11T00:00:00', 'deporte', { source: 'csv' }),
        ex('Decathlon', 3500, '2026-10-11T00:00:00', 'deporte', { source: 'csv' }),
      ],
    }, today);
    expect(r.filter((m) => m.kind === 'double').map((m) => m.merchant)).toEqual(['Decathlon']);
  });

  it('comercios por palabra entera: un gimnasio o un hotel no son aerolíneas ni tiendas', () => {
    const r = findMoneyBack({
      expenses: [
        ex('Level Gym', 4500, '2026-09-01T12:00:00', 'deporte'),
        ex('Swissotel Barcelona', 18000, '2026-09-02T12:00:00', 'otros'),
        ex('Cosmetics Market', 2500, '2026-10-08T12:00:00'),
        ex('Ikea Alcorcón', 60000, '2026-01-01T12:00:00', 'casa'),
        ex('LEVEL', 30000, '2026-08-01T12:00:00', 'transporte'),
      ],
    }, today);
    expect(r.map((m) => [m.kind, m.merchant])).toEqual([['flight', 'LEVEL']]);
  });

  it('vuelos: solo del último año y como mucho unos pocos; garantías: solo electrónica y las más recientes', () => {
    const flights = ['2026-09-01', '2026-08-01', '2026-07-01', '2026-06-01', '2025-06-01'].map((d) => ex('Vueling', 9000, `${d}T07:00:00`, 'transporte'));
    const gadgets = ['2026-09-10', '2026-06-10', '2026-03-10', '2025-12-10'].map((d) => ex('MediaMarkt', 30000, `${d}T17:00:00`));
    const r = findMoneyBack({ expenses: [...flights, ...gadgets, ex('El Corte Inglés', 40000, '2026-05-05T12:00:00'), ex('Amazon', 9000, '2026-05-05T12:00:00')] }, today);
    expect(r.filter((m) => m.kind === 'flight').map((m) => m.until)).toEqual(['2031-07-01', '2031-08-01', '2031-09-01']);
    const w = r.filter((m) => m.kind === 'warranty');
    expect(w.map((m) => m.until)).toEqual(['2029-03-10', '2029-06-10', '2029-09-10']);
    expect(w.every((m) => m.merchant === 'MediaMarkt')).toBe(true);
  });

  it('una suscripción nueva cara (anual) no se multiplica por 12', () => {
    const r = findMoneyBack({ expenses: [ex('Canva', 11999, '2026-10-12T09:00:00', 'suscripciones')] }, today);
    expect(r[0]).toMatchObject({ kind: 'newSub', amount: 11999, yearly: true });
  });

  it('subidas: no en luz, agua o teléfono, y al descartarla no vuelve con el siguiente importe', () => {
    const months = ['2026-07-05', '2026-08-05', '2026-09-05', '2026-10-05'];
    const light = months.map((d, i) => ex('Iberdrola', [4500, 4600, 4700, 4900][i], `${d}T09:00:00`, 'casa'));
    expect(findMoneyBack({ expenses: light }, today).filter((m) => m.kind === 'priceUp')).toHaveLength(0);

    const music = months.map((d, i) => ex('Spotify', i < 3 ? 1099 : 1199, `${d}T09:00:00`, 'suscripciones'));
    let state = { ...initialState, expenses: music };
    const up = findMoneyBack(state, today).find((m) => m.kind === 'priceUp')!;
    expect(up.id).toBe('up-spotify');
    state = reducer(state, { type: 'moneyBackDismiss', id: up.id });
    state = { ...state, expenses: [...state.expenses, ex('Spotify', 1299, '2026-11-05T09:00:00', 'suscripciones')] };
    expect(findMoneyBack(state, new Date('2026-11-10T12:00:00')).filter((m) => m.kind === 'priceUp')).toHaveLength(0);
  });
});
