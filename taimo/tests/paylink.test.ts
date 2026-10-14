import { describe, expect, it } from 'vitest';

import { buildPayRequest, canBePaid, decodePayRequest, encodePayRequest, payLink, type PayRequest } from '../src/domain/paylink';
import type { Expense, Group } from '../src/domain/types';

const group: Group = {
  id: 'g1',
  name: 'Viaje a Oporto 🇵🇹',
  emoji: '🧳',
  createdAt: '2026-10-01',
  members: [
    { id: 'me', name: 'Fer', isMe: true },
    { id: 'ana', name: 'Ana' },
    { id: 'luis', name: 'Luís' },
  ],
};
const ex = (id: string, paidBy: string, shares: Record<string, number>, date: string, merchant = 'Cena'): Expense => ({
  id,
  amount: Object.values(shares).reduce((a, b) => a + b, 0),
  merchant,
  category: 'comer',
  date,
  source: 'manual',
  groupId: 'g1',
  paidBy,
  shares,
});

describe('enlace para cobrar sin instalar nada', () => {
  const expenses = [
    ex('1', 'me', { me: 1000, ana: 1000, luis: 1000 }, '2026-10-02T20:00:00Z', 'Restaurante Ñandú'),
    ex('2', 'me', { me: 500, luis: 500 }, '2026-10-03T10:00:00Z', 'Gasolina'),
    ex('3', 'ana', { me: 700, ana: 700 }, '2026-10-04T10:00:00Z', 'Museo'),
    ex('4', 'me', { me: 300, ana: 300 }, '2026-10-05T10:00:00Z', 'Café'),
  ];

  it('lleva importe, cómo pagar y los gastos en los que participó quien debe', () => {
    const req = buildPayRequest(group, expenses, 'ana', 'me', 600, { bizum: ' 600111222 ', iban: '' }, { from: 'Ana', to: 'Fer' }, 'EUR');
    expect(req).toMatchObject({ g: 'Viaje a Oporto 🇵🇹', f: 'Ana', t: 'Fer', a: 600, c: 'EUR', p: { bizum: '600111222' } });
    expect(req.p.iban).toBeUndefined();
    // Solo gastos que pagó otro y en los que Ana tiene parte, del más nuevo al más viejo.
    expect(req.x).toEqual([
      ['Café', 300, '2026-10-05'],
      ['Restaurante Ñandú', 1000, '2026-10-02'],
    ]);
    expect(canBePaid(req)).toBe(true);
    expect(canBePaid({ p: {} })).toBe(false);
  });

  it('ida y vuelta con acentos, emojis y nombres raros', () => {
    const req: PayRequest = { g: 'Piso Gràcia 🏠', e: '🏠', f: 'Zoë', t: 'José Ñ', a: 123456, c: 'EUR', p: { paypal: 'jose', revolut: '@jose' }, x: [['Mercadoña ✓', 2500, '2026-10-10']] };
    const link = payLink('https://taimo.app/', req);
    expect(link.startsWith('https://taimo.app/pay#')).toBe(true);
    expect(link).toMatch(/^[\w:/.#-]+$/); // nada que WhatsApp pueda romper
    expect(decodePayRequest(link)).toEqual(req);
    expect(decodePayRequest(encodePayRequest(req))).toEqual(req);
    expect(decodePayRequest(`taimo://pay?d=${encodePayRequest(req)}`)).toEqual(req);
  });

  it('rechaza enlaces rotos o con datos falsos', () => {
    expect(decodePayRequest('https://taimo.app/pay#nada!!')).toBeNull();
    expect(decodePayRequest('https://taimo.app/pay#')).toBeNull();
    const bad = (o: object) => decodePayRequest(encodePayRequest(o as PayRequest));
    expect(bad({ g: 'x', a: -5, c: 'EUR', p: {} })).toBeNull();
    expect(bad({ g: 'x', a: 1.5, c: 'EUR', p: {} })).toBeNull();
    expect(bad({ g: 'x', a: 100, c: 'euros', p: {} })).toBeNull();
    // Campos de más o demasiado largos se recortan.
    const r = bad({ g: 'x'.repeat(500), a: 100, c: 'eur', p: { bizum: '6001', evil: 'js' }, x: [[1, 2, 3], 'z'] });
    expect(r?.g.length).toBe(64);
    expect(r?.c).toBe('EUR');
    expect(r?.p).toEqual({ bizum: '6001' });
  });
});
