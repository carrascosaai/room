import { describe, expect, it } from 'vitest';

import { applyTableClaim, cashClaim, claimLink, decodeClaim, startTable, suggestedShare, tableUnpaid, type TableBill } from '../src/domain/table';
import { initialState } from '../src/store/store';
import type { AppState } from '../src/domain/types';

const bill: TableBill = { id: 'cash01', m: 'Bar Pepe', c: 'EUR', t: 'Fernando', p: { bizum: '600111222' }, i: [], n: 4, x: 8000, d: '2026-10-19' };

const table = (): AppState => {
  const st: AppState = { ...initialState, expenses: [{ id: 'e1', amount: 8000, merchant: 'Bar Pepe', category: 'comer', date: '2026-10-19T21:00:00.000Z', source: 'manual' }] };
  return startTable(st, 'e1', bill, 'me')!.state;
};

describe('Paga tu parte: pagos en efectivo', () => {
  it('el comensal avisa de que pagó en efectivo y viaja en el enlace', () => {
    const claim = { b: bill.id, w: 'Lucía', i: [], a: 2000, u: 'luci1234', k: 'cash' as const };
    expect(decodeClaim(claimLink('https://x/taimo', claim))).toEqual(claim);
    // Un valor raro en «k» se ignora.
    const enc = 'https://x/mesa-pagado#' + Buffer.from(JSON.stringify({ ...claim, k: 'bitcoin' })).toString('base64url');
    expect(decodeClaim(enc)?.k).toBeUndefined();
  });

  it('quien pagó lo apunta a mano y queda como pagado en efectivo', () => {
    let state = table();
    expect(tableUnpaid(state.groups[0], state.settlements)).toBe(3);
    // 80 € entre 4: le tocan 20 € a cada uno de los que faltan.
    expect(suggestedShare(state.groups[0], state.expenses[0], state.settlements)).toBe(2000);

    const claim = cashClaim(bill, '  Pablo  ', 2000, () => 0.5);
    expect(claim.w).toBe('Pablo');
    expect(claim.k).toBe('cash');
    const r = applyTableClaim(state, claim);
    expect(r.status).toBe('added');
    state = r.state;
    expect(state.settlements[0].method).toBe('cash');
    expect(state.settlements[0].amount).toBe(2000);
    expect(tableUnpaid(state.groups[0], state.settlements)).toBe(2);
    expect(suggestedShare(state.groups[0], state.expenses[0], state.settlements)).toBe(2000);
  });

  it('un pago normal no se marca como efectivo', () => {
    const r = applyTableClaim(table(), { b: bill.id, w: 'Ana', i: [], a: 2000, u: 'anaa1111' });
    expect(r.state.settlements[0].method).toBeUndefined();
  });

  it('cuando ya han pagado todos, no propone nada', () => {
    let state = table();
    for (const [w, u] of [['A', 'aaaa1111'], ['B', 'bbbb2222'], ['C', 'cccc3333']]) {
      state = applyTableClaim(state, { b: bill.id, w, i: [], a: 2000, u }).state;
    }
    expect(tableUnpaid(state.groups[0], state.settlements)).toBe(0);
    expect(suggestedShare(state.groups[0], state.expenses[0], state.settlements)).toBe(0);
  });
});
