import { describe, expect, it } from 'vitest';

import { parseReceipt, toRows, type OcrLine } from '../src/domain/receipt';

describe('tickets', () => {
  it('ticket de supermercado español', () => {
    const r = parseReceipt([
      'MERCADONA, S.A.',
      'C/ Colón 50 - Valencia',
      'NIF A-46103834',
      '13/10/2026 18:42  OP: 123',
      '1 LECHE ENTERA      0,95',
      '2 x PAN BAGUETTE    1,30',
      'TOMATE RAMA         2,15',
      'TOTAL (€)           4,40',
      'IVA 10%             0,40',
      'TARJETA BANCARIA    4,40',
    ]);
    expect(r).toMatchObject({ merchant: 'MERCADONA, S.A.', total: 440, currency: 'EUR' });
    expect(r.date?.slice(0, 10)).toBe('2026-10-13');
    expect(r.items).toEqual([
      { name: 'LECHE ENTERA', amount: 95 },
      { name: 'PAN BAGUETTE', amount: 130 },
      { name: 'TOMATE RAMA', amount: 215 },
    ]);
  });

  it('restaurante con propina y subtotal (inglés)', () => {
    const r = parseReceipt(['Joe’s Diner', '2026-10-12', 'Burger 12.50', 'Fries 4.00', 'Subtotal 16.50', 'Tip 3.00', 'Total $19.50', 'Visa ****1234'], 'USD');
    expect(r).toMatchObject({ merchant: 'Joe’s Diner', total: 1950, currency: 'USD' });
    expect(r.items.map((i) => i.name)).toEqual(['Burger', 'Fries']);
  });

  it('alemán: Summe', () => {
    expect(parseReceipt(['REWE Markt GmbH', 'Bananen 1,29', 'Milch 0,99', 'SUMME EUR 2,28', 'Geg. Karte 2,28']).total).toBe(228);
  });

  it('sin la palabra total, el mayor importe', () => {
    expect(parseReceipt(['Café Central', 'Cortado 1,60', 'Croissant 1,80', '3,40']).total).toBe(340);
  });

  it('junta en una fila lo que el lector da en columnas', () => {
    const l = (text: string, x: number, y: number): OcrLine => ({ text, x, y, w: 0.3, h: 0.02 });
    expect(toRows([l('2,50', 0.8, 0.301), l('Café', 0.1, 0.3), l('TOTAL', 0.1, 0.5), l('2,50', 0.8, 0.502)])).toEqual(['Café  2,50', 'TOTAL  2,50']);
  });
});
