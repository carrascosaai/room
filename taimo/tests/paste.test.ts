import { describe, expect, it } from 'vitest';

import { parsePastedPayment, tidyMerchant } from '../src/domain/notifications';

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

  it('el dinero que te llega o los códigos no son un gasto', () => {
    for (const text of [
      'Devolución de 25,00 € en ZARA',
      'Refund of €19.99 from Amazon',
      'Bizum recibido de Ana: 15,00 €',
      'Transferencia recibida 300,00 EUR',
      'Nómina octubre 1.450,00 €',
      'Tu código de verificación para el pago de 49,90 € es 123456',
      'Your code is 4821 for 10 €',
      '✅ Fernando, te he pagado 36,50 € de Casa Lucío. Ábrelo para apuntarlo: https://x/mesa-pagado#abc',
    ]) {
      expect(parsePastedPayment(text, { home: 'EUR' }), text).toBeNull();
    }
  });

  it('el comercio se deja como se pegó; solo se suaviza si viene todo en mayúsculas', () => {
    expect(tidyMerchant('BURGER KING')).toBe('Burger King');
    expect(tidyMerchant("McDonald's")).toBe("McDonald's");
    expect(tidyMerchant('IKEA')).toBe('Ikea');
    expect(tidyMerchant('H&M')).toBe('H&M');
  });
});

describe('pegar un aviso con fecha', () => {
  const now = new Date('2026-10-14T10:00:00');
  it('el comercio no se lleva el «el» ni la fecha, y la fecha se devuelve', () => {
    const r = parsePastedPayment('Pago con tarjeta de 23,40 € en BAR MANOLO SL el 13/10/2026', { home: 'EUR', now });
    expect(r).toMatchObject({ amount: 2340, merchant: 'BAR MANOLO SL', date: '2026-10-13' });
    expect(parsePastedPayment('Card payment of €5.00 at BLUE CAFE on 2026-10-12', { home: 'EUR', now })).toMatchObject({ merchant: 'BLUE CAFE', date: '2026-10-12' });
    expect(parsePastedPayment('Kartenzahlung 8,00 EUR bei REWE am 11.10.2026', { home: 'EUR', now })).toMatchObject({ merchant: 'REWE', date: '2026-10-11' });
  });
  it('«el» dentro del nombre se queda; sin fecha no hay fecha', () => {
    const r = parsePastedPayment('Compra con tarjeta de 10,00 € en BAR EL PUERTO', { home: 'EUR', now });
    expect(r?.merchant).toBe('BAR EL PUERTO');
    expect(r?.date).toBeUndefined();
  });
  it('fechas imposibles o del futuro no valen', async () => {
    const { findDate } = await import('../src/domain/notifications');
    expect(findDate('el 31/02/2026', now)).toBeNull();
    expect(findDate('el 20/12/2026', now)).toBeNull();
    expect(findDate('el 13/10/26', now)).toBe('2026-10-13');
  });
});
