import { describe, expect, it } from 'vitest';

import { pendingKind } from '../src/domain/capture';
import { parseBankNotice } from '../src/domain/notifications';

const opts = { home: 'EUR', now: new Date('2026-10-19T10:00:00Z') };

describe('aviso del banco en iPhone (Atajos de iOS 27)', () => {
  it('se reconoce en la cola de pendientes', () => {
    expect(pendingKind({ text: 'Pago de 12,40 €', app: 'BBVA', source: 'banknotice' }, 'ios')).toBe('banknotice');
    // Lo demás sigue igual.
    expect(pendingKind({ text: '50 euros en comida', source: 'siri' }, 'ios')).toBe('siri');
    expect(pendingKind({ amount: '12', merchant: 'X', source: 'applepay' }, 'ios')).toBe('wallet');
  });

  it.each([
    ['BBVA', 'Pago con tarjeta de 12,40 € en MERCADONA', 1240, 'Mercadona'],
    ['Santander', 'Compra con tarjeta *5678 de 8,90 EUR en BURGER KING. Saldo disponible 1.234,56 EUR', 890, 'Burger King'],
    ['CaixaBank', 'Has pagado 23,50 € en AMAZON con tu tarjeta', 2350, 'Amazon'],
    ['ING', 'Compra de 45,00 € en ZARA', 4500, 'Zara'],
    ['Revolut', 'Has pagado 9,99 € a Netflix', 999, 'Netflix'],
    ['Openbank', 'Cargo de 30 € en GASOLINERA REPSOL', 3000, 'Gasolinera Repsol'],
  ])('%s: «%s» → %i céntimos', (app, text, cents, merchant) => {
    const r = parseBankNotice(text, app, opts);
    expect(r?.amount).toBe(cents);
    expect(r?.currency).toBe('EUR');
    expect(r?.merchant).toContain(merchant);
    expect(r?.card).toBe(app);
    expect(r?.source).toBe('notificacion');
    expect(r?.app).toBe(`ios:${app}`);
  });

  it.each([
    ['BBVA', 'Has recibido un Bizum de 20,00 € de Ana'],
    ['Santander', 'Te han ingresado la nómina: 1.500,00 €'],
    ['CaixaBank', 'Tu código de verificación es 123456'],
    ['ING', 'Devolución de 15,00 € de ZARA'],
    ['BBVA', 'Tu saldo disponible es 1.234,56 €'],
  ])('%s: «%s» no es un gasto', (app, text) => {
    expect(parseBankNotice(text, app, opts)).toBeNull();
  });

  it('usa la hora del aviso si la trae', () => {
    const r = parseBankNotice('Pago de 5 € en BAR PEPE', 'BBVA', { ...opts, postedAt: '2026-10-19T08:30:00.000Z' });
    expect(r?.date).toBe('2026-10-19T08:30:00.000Z');
  });
});
