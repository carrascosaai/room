import { describe, expect, it } from 'vitest';

import { applyTableClaim, billLink, billTotal, claimAmount, claimLink, compactBill, decodeBill, decodeClaim, findClaimInText, ITEM_NAME_MAX, MAX_LINK, newDinerId, previewTableClaim, sharedPart, startTable, type TableBill } from '../src/domain/table';
import { initialState } from '../src/store/store';
import { myShare } from '../src/domain/budget';
import type { AppState } from '../src/domain/types';

const bill: TableBill = {
  id: 'abc123',
  m: 'Casa Lucío',
  c: 'EUR',
  t: 'Fernando',
  p: { bizum: '600111222' },
  i: [
    ['Huevos rotos', 1400],
    ['Vino Rioja', 2400],
    ['Solomillo', 2600],
    ['Merluza', 2200],
    ['Ensalada', 1200],
  ],
  s: [0, 1],
  n: 4,
  x: 400, // pan y servicio
  d: '2026-10-14',
};

describe('Paga tu parte', () => {
  it('cada uno paga lo suyo más su parte de lo compartido', () => {
    expect(billTotal(bill)).toBe(10200);
    // compartido: 1400 + 2400 + 400 = 4200 / 4 = 1050
    expect(claimAmount(bill, [2])).toBe(2600 + 1050);
    expect(claimAmount(bill, [3, 4])).toBe(2200 + 1200 + 1050);
    // Elegir algo compartido o repetido no cuenta dos veces.
    expect(claimAmount(bill, [0, 2, 2, 99])).toBe(2600 + 1050);
  });

  it('el QR y el aviso van y vuelven sin servidor', () => {
    const link = billLink('https://room.example/taimo/', bill);
    expect(link.startsWith('https://room.example/taimo/mesa#')).toBe(true);
    expect(link.length).toBeLessThan(700); // cabe en un QR que se lee bien desde una pantalla
    expect(decodeBill(link)).toEqual(bill);
    const claim = { b: bill.id, w: 'Lucía', i: [2], a: 3650 };
    const back = claimLink('https://room.example/taimo', claim);
    expect(decodeClaim(back)).toEqual(claim);
    expect(findClaimInText(`✅ Ya te he pagado 36,50 € de Casa Lucío\n${back}`)).toEqual(claim);
  });

  it('rechaza mesas rotas o manipuladas', () => {
    expect(decodeBill('https://x/mesa#basura!!')).toBeNull();
    const enc = (o: object) => 'https://x/mesa#' + Buffer.from(JSON.stringify(o)).toString('base64url');
    expect(decodeBill(enc({ ...bill, n: 0 }))).toBeNull();
    expect(decodeBill(enc({ ...bill, c: 'euros' }))).toBeNull();
    expect(decodeBill(enc({ ...bill, i: [['x', -5]] }))).toBeNull();
    expect(decodeBill(enc({ ...bill, i: [], x: 0 }))).toBeNull();
    expect(decodeBill(enc({ ...bill, s: [0, 0, 77] }))?.s).toEqual([0]);
    expect(decodeClaim(enc({ b: 'abc', w: 'Ana', a: 0 }))).toBeNull();
  });

  it('al llegar los avisos, en tu presupuesto solo queda lo tuyo', () => {
    let state: AppState = { ...initialState, profile: { ...initialState.profile, name: 'Fernando', currency: 'EUR' } };
    state = { ...state, expenses: [{ id: 'e1', amount: 10200, merchant: 'Casa Lucío', category: 'comer', date: '2026-10-14T21:00:00.000Z', source: 'applepay' }] };
    const started = startTable(state, 'e1', bill, 'me')!;
    state = started.state;
    expect(myShare(state.expenses[0], state.groups)).toBe(10200);

    let r = applyTableClaim(state, { b: bill.id, w: 'Lucía', i: [2], a: 3650 });
    expect(r.status).toBe('added');
    state = r.state;
    r = applyTableClaim(state, { b: bill.id, w: 'Pablo', i: [3, 4], a: 4450 });
    state = r.state;
    // El mismo aviso otra vez no duplica nada.
    r = applyTableClaim(state, { b: bill.id, w: 'lucia', i: [2], a: 3650 });
    expect(r.status).toBe('updated');
    state = r.state;

    const e = state.expenses[0];
    expect(Object.values(e.shares!).reduce((a, b) => a + b, 0)).toBe(10200);
    expect(myShare(e, state.groups)).toBe(10200 - 3650 - 4450);
    expect(state.settlements).toHaveLength(2);
    expect(state.groups[0].members.map((m) => m.name)).toEqual(['Fernando', 'Lucía', 'Pablo']);
    expect(applyTableClaim(state, { b: 'otra', w: 'Ana', i: [], a: 100 }).status).toBe('unknown');
  });

  it('nadie puede apuntar más de lo que queda', () => {
    let state: AppState = { ...initialState, expenses: [{ id: 'e1', amount: 5000, merchant: 'Bar', category: 'comer', date: '2026-10-14T21:00:00.000Z', source: 'manual' }] };
    state = startTable(state, 'e1', { ...bill, id: 't1' }, 'me')!.state;
    const r = applyTableClaim(state, { b: 't1', w: 'Ana', i: [], a: 9000 });
    expect(r.status === 'added' && r.amount).toBe(5000);
    expect(applyTableClaim(r.state, { b: 't1', w: 'Luis', i: [], a: 100 }).status).toBe('nothingLeft');
  });

  const table = (amount = 10200, id = 't2') => {
    const st: AppState = { ...initialState, expenses: [{ id: 'e1', amount, merchant: 'Bar', category: 'comer', date: '2026-10-14T21:00:00.000Z', source: 'manual' }] };
    return startTable(st, 'e1', { ...bill, id }, 'me')!.state;
  };

  it('el id de comensal: dos «Ana» no se pisan y reenviar el mismo aviso no duplica', () => {
    let state = table();
    state = applyTableClaim(state, { b: 't2', w: 'Ana', i: [2], a: 3650, u: 'aaaa1111' }).state;
    state = applyTableClaim(state, { b: 't2', w: 'ana', i: [3], a: 3250, u: 'bbbb2222' }).state;
    const again = applyTableClaim(state, { b: 't2', w: 'Ana M.', i: [2], a: 3650, u: 'aaaa1111' });
    expect(again.status).toBe('updated');
    state = again.state;
    expect(state.groups[0].members.map((m) => m.name)).toEqual(['·', 'Ana M.', 'ana']);
    expect(state.settlements).toHaveLength(2);
    expect(new Set(state.settlements.map((x) => x.id)).size).toBe(2);
  });

  it('nombres en otro alfabeto (avisos antiguos sin id) tampoco se pisan', () => {
    let state = table();
    state = applyTableClaim(state, { b: 't2', w: 'Анна', i: [], a: 1000 }).state;
    state = applyTableClaim(state, { b: 't2', w: 'Μαρία', i: [], a: 1000 }).state;
    expect(state.groups[0].members).toHaveLength(3);
  });

  it('el id viaja en el aviso; los avisos antiguos siguen valiendo', () => {
    const u = newDinerId();
    expect(u).toMatch(/^[a-z0-9]{10}$/);
    const claim = { b: bill.id, w: 'Lucía', i: [2], a: 3650, u };
    expect(decodeClaim(claimLink('https://x', claim))).toEqual(claim);
    expect(decodeClaim(claimLink('https://x', { b: bill.id, w: 'Lucía', i: [2], a: 3650 }))).toEqual({ b: bill.id, w: 'Lucía', i: [2], a: 3650 });
    const enc = (o: object) => 'https://x/mesa-pagado#' + Buffer.from(JSON.stringify(o)).toString('base64url');
    expect(decodeClaim(enc({ ...claim, u: '<script>' }))).toEqual({ b: bill.id, w: 'Lucía', i: [2], a: 3650 });
  });

  it('a quien pagó se le dice lo que se apunta de verdad y si no cuadra', () => {
    let state = table(5000);
    // Lo que eligió (Solomillo + compartido) son 3650, pero dice 9000 y solo quedan 5000.
    let p = previewTableClaim(state, { b: 't2', w: 'Ana', i: [2], a: 9000, u: 'aaaa1111' });
    expect(p).toMatchObject({ status: 'added', amount: 5000, expected: 3650, capped: true, mismatch: true });
    state = applyTableClaim(state, { b: 't2', w: 'Ana', i: [2], a: 9000, u: 'aaaa1111' }).state;
    p = previewTableClaim(state, { b: 't2', w: 'Luis', i: [3], a: 3250, u: 'cccc3333' });
    expect(p).toMatchObject({ status: 'nothingLeft', amount: 0 });
    expect(previewTableClaim(table(), { b: 't2', w: 'Eva', i: [2], a: 3650 })).toMatchObject({ status: 'added', amount: 3650, capped: false, mismatch: false });
  });

  it('lo compartido se redondea a lo que tiene la moneda', () => {
    expect(sharedPart({ ...bill, c: 'JPY', i: [['寿司', 100000]], s: [0], x: 0, n: 3 })).toBe(33300);
    expect(sharedPart({ ...bill, c: 'EUR', i: [['Vino', 1000]], s: [0], x: 0, n: 3 })).toBe(333);
  });

  it('el QR siempre se puede leer: nombres cortos y, si no cabe, se avisa', () => {
    const long = 'Ensalada de la casa con queso de cabra'.slice(0, 30);
    const make = (n: number): TableBill => ({ ...bill, i: Array.from({ length: n }, (_, k) => [`${long} ${k}`, 1000 + k] as [string, number]), s: undefined, x: undefined });
    const ok = compactBill('https://room.example/taimo', make(20));
    expect(ok.fits).toBe(true);
    expect(ok.link.length).toBeLessThanOrEqual(MAX_LINK);
    expect(ok.bill.i.every(([name]) => name.length <= ITEM_NAME_MAX)).toBe(true);
    expect(decodeBill(ok.link)?.i).toHaveLength(20);
    expect(compactBill('https://room.example/taimo', make(40)).fits).toBe(false);
  });
});
