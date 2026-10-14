import { describe, expect, it } from 'vitest';

import { applyTableClaim, billLink, billTotal, claimAmount, claimLink, decodeBill, decodeClaim, findClaimInText, startTable, type TableBill } from '../src/domain/table';
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
});
