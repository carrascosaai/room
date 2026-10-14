import { describe, expect, it } from 'vitest';

import { parsePastedPayment } from '../src/domain/notifications';

describe('pegar el aviso del banco', () => {
  it('saca importe y comercio de avisos típicos', () => {
    expect(parsePastedPayment('BBVA: Compra con tu tarjeta ·1234 de 23,40 € en MERCADONA', { home: 'EUR' })).toMatchObject({ amount: 2340, currency: 'EUR', merchant: 'MERCADONA' });
    expect(parsePastedPayment('Has pagado 12,50 EUR en BURGER KING con tu tarjeta terminada en 5678', { home: 'EUR' })).toMatchObject({ amount: 1250, merchant: 'BURGER KING' });
    expect(parsePastedPayment('Santander: Operación con tarjeta 4,20€ en STARBUCKS MADRID', { home: 'EUR' })).toMatchObject({ amount: 420 });
  });
  it('con solo un importe también vale; sin importe, nada', () => {
    expect(parsePastedPayment('Pago 9,99 €', { home: 'EUR' })).toMatchObject({ amount: 999 });
    expect(parsePastedPayment('hola qué tal', { home: 'EUR' })).toBeNull();
    expect(parsePastedPayment('', { home: 'EUR' })).toBeNull();
  });
});
