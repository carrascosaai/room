import { describe, expect, it } from 'vitest';

import { categoryStatus, dailySpending, monthSummary, myShare, spentByCategory } from '../src/domain/budget';
import { findDuplicate, parseCaptureParams } from '../src/domain/capture';
import { categorize } from '../src/domain/categorize';
import { balances, splitEqually, suggestTransfers } from '../src/domain/groups';
import { formatMoney, parseAmount } from '../src/domain/money';
import type { Expense, Group } from '../src/domain/types';

describe('parseAmount', () => {
  it.each([
    ['12,50 €', 1250],
    ['€12.50', 1250],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['-8,90 EUR', 890],
    ['12', 1200],
    ['1.234', 123400],
    ['0,99', 99],
    [7.5, 750],
  ])('%s -> %i', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it('rechaza textos sin número', () => {
    expect(parseAmount('gratis')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it('formatea en euros', () => {
    expect(formatMoney(1250).replace(/\s/g, ' ')).toBe('12,50 €');
  });
});

describe('categorize', () => {
  it.each([
    ['MERCADONA S.A.', 'super'],
    ['Lidl Madrid', 'super'],
    ['UBER EATS', 'comer'],
    ['Uber BV', 'transporte'],
    ['Netflix.com', 'suscripciones'],
    ['Amazon Prime', 'suscripciones'],
    ['AMAZON EU SARL', 'compras'],
    ['Decathlon', 'deporte'],
    ['Ticketmaster Spain', 'ocio'],
    ['Bar Manolo', 'comer'],
    ['FC Barcelona Store', 'ocio'],
    ['Farmacia López', 'salud'],
    ['Comercio raro 123', 'otros'],
  ])('%s -> %s', (merchant, expected) => {
    expect(categorize(merchant)).toBe(expected);
  });

  it('las correcciones del usuario mandan', () => {
    expect(categorize('Mercadona', { mercadona: 'casa' })).toBe('casa');
  });
});

const me = { id: 'me', name: 'Yo', isMe: true };
const ana = { id: 'ana', name: 'Ana' };
const luis = { id: 'luis', name: 'Luis' };
const piso: Group = { id: 'g1', name: 'Piso', emoji: '🏠', members: [me, ana, luis], createdAt: '2026-10-01' };

function exp(partial: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36),
    amount: 1000,
    merchant: 'X',
    category: 'otros',
    date: '2026-10-10T12:00:00.000Z',
    source: 'manual',
    ...partial,
  };
}

describe('groups', () => {
  it('reparte céntimos sin perder ninguno', () => {
    const shares = splitEqually(1000, ['a', 'b', 'c']);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(1000);
    expect(shares).toEqual({ a: 334, b: 333, c: 333 });
  });

  it('calcula saldos y transferencias', () => {
    const e1 = exp({ groupId: 'g1', amount: 9000, paidBy: 'me', shares: splitEqually(9000, ['me', 'ana', 'luis']) });
    const e2 = exp({ groupId: 'g1', amount: 3000, paidBy: 'ana', shares: splitEqually(3000, ['me', 'ana', 'luis']) });
    const b = balances(piso, [e1, e2], []);
    expect(b).toEqual({ me: 5000, ana: -1000, luis: -4000 });
    const t = suggestTransfers(b);
    expect(t).toEqual([
      { from: 'luis', to: 'me', amount: 4000 },
      { from: 'ana', to: 'me', amount: 1000 },
    ]);
    const settled = balances(piso, [e1, e2], [
      { id: 's1', groupId: 'g1', from: 'luis', to: 'me', amount: 4000, date: '2026-10-11' },
      { id: 's2', groupId: 'g1', from: 'ana', to: 'me', amount: 1000, date: '2026-10-11' },
    ]);
    expect(Object.values(settled).every((v) => v === 0)).toBe(true);
  });
});

describe('budget', () => {
  const today = new Date(2026, 9, 21); // 21 de octubre de 2026

  it('en un gasto compartido solo cuenta mi parte, aunque pague yo todo', () => {
    const shared = exp({ groupId: 'g1', amount: 10000, paidBy: 'me', shares: { me: 5000, ana: 5000 } });
    expect(myShare(shared, [piso])).toBe(5000);
    expect(myShare(exp({ amount: 2500 }), [piso])).toBe(2500);
  });

  it('resume el mes y calcula lo que puedes gastar al día', () => {
    const state = {
      groups: [piso],
      budgets: { ocio: 10000, super: 20000 },
      expenses: [
        exp({ category: 'ocio', amount: 5000, date: new Date(2026, 9, 5).toISOString() }),
        exp({ category: 'super', amount: 6000, date: new Date(2026, 9, 6).toISOString() }),
        exp({ category: 'super', amount: 99999, date: new Date(2026, 8, 6).toISOString() }), // septiembre
      ],
    };
    const s = monthSummary(state, today);
    expect(s.spent).toBe(11000);
    expect(s.remaining).toBe(19000);
    expect(s.daysLeft).toBe(11); // del 21 al 31, ambos incluidos
    expect(s.dailyAllowance).toBe(Math.floor(19000 / 11));
    expect(spentByCategory(state, '2026-10').ocio).toBe(5000);
    expect(categoryStatus(state, 'ocio', today).level).toBe('ok');
    expect(dailySpending(state, today)[4]).toBe(5000);
  });

  it('avisa cuando te acercas o te pasas', () => {
    const base = { groups: [], budgets: { ocio: 10000 } };
    const at = (amount: number) =>
      categoryStatus({ ...base, expenses: [exp({ category: 'ocio', amount, date: today.toISOString() })] }, 'ocio', today).level;
    expect(at(5000)).toBe('ok');
    expect(at(8500)).toBe('warning');
    expect(at(12000)).toBe('over');
  });
});

describe('capture', () => {
  const now = new Date('2026-10-13T18:00:00.000Z');

  it('interpreta lo que manda el Atajo de Apple Pay', () => {
    const p = parseCaptureParams({ amount: '50,00 €', merchant: 'Ticketmaster', card: 'BBVA Visa' }, {}, now);
    expect(p).toEqual({
      amount: 5000,
      merchant: 'Ticketmaster',
      card: 'BBVA Visa',
      category: 'ocio',
      source: 'applepay',
      date: now.toISOString(),
    });
  });

  it('ignora capturas sin importe', () => {
    expect(parseCaptureParams({ merchant: 'X' }, {}, now)).toBeNull();
    expect(parseCaptureParams({ amount: '0,00 €' }, {}, now)).toBeNull();
  });

  it('detecta el mismo pago capturado dos veces', () => {
    const p = parseCaptureParams({ amount: '12,30', merchant: 'Mercadona' }, {}, now)!;
    const prev = exp({ amount: 1230, merchant: 'MERCADONA', date: new Date(now.getTime() - 60_000).toISOString() });
    expect(findDuplicate([prev], p)).toBe(prev);
    const old = { ...prev, date: new Date(now.getTime() - 3600_000).toISOString() };
    expect(findDuplicate([old], p)).toBeUndefined();
  });
});
