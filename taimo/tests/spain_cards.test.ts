import { describe, expect, it } from 'vitest';

import { parsePaymentNotification, type RawNotification } from '../src/domain/notifications';

/**
 * Avisos de pago con el formato típico de los bancos y carteras en España
 * (tarjeta física, contactless, online, Apple Pay/Google Pay, SMS). Son
 * ejemplos realistas, no copias de avisos reales: hay que confirmarlos en un
 * móvil con cada banco antes del lanzamiento.
 */
const at = '2026-10-14T10:00:00.000Z';
const n = (pkg: string, title: string, text: string): RawNotification => ({ package: pkg, title, text, postedAt: at });
const parse = (x: RawNotification) => parsePaymentNotification(x, { home: 'EUR' });

const SMS = 'com.google.android.apps.messaging';
const SAMSUNG_SMS = 'com.samsung.android.messaging';
const GMAIL = 'com.google.android.gm';

const PAYMENTS: [string, RawNotification, number, string][] = [
  ['BBVA tarjeta física', n('com.bbva.bbvacontigo', 'BBVA', 'Compra con tu tarjeta ·1234 por 23,40 € en MERCADONA'), 2340, 'MERCADONA'],
  ['BBVA online', n('com.bbva.bbvacontigo', 'Compra online', 'Has hecho una compra de 59,99 € en AMAZON EU con tu tarjeta ·1234'), 5999, 'AMAZON EU'],
  ['Santander', n('es.bancosantander.apps', 'Santander', 'Pago con tarjeta de 4,20 EUR en STARBUCKS GRAN VIA'), 420, 'STARBUCKS GRAN VIA'],
  ['CaixaBank', n('es.lacaixa.mobile.android.newwapicon', 'CaixaBank', 'Compra de 15,30€ en ZARA con la tarjeta acabada en 5678'), 1530, 'ZARA'],
  ['imagin', n('com.imaginbank.app', 'imagin', 'Has pagado 8,50 € en BURGER KING'), 850, 'BURGER KING'],
  ['ING', n('es.ingdirect.android', 'Pago con tarjeta', 'Pago de 32,10 € en REPSOL con tu tarjeta *4321'), 3210, 'REPSOL'],
  ['Openbank', n('com.openbank.app', 'Openbank', 'Compra en CARREFOUR por importe de 41,75 EUR'), 4175, 'CARREFOUR'],
  ['Sabadell', n('net.inverline.bancosabadell.officelocator.android', 'Sabadell', 'Compra con tarjeta 12,00 EUR en FARMACIA LOPEZ'), 1200, 'FARMACIA LOPEZ'],
  ['Bankinter', n('es.bankinter.bankingapp', 'Bankinter', 'Operación con tarjeta: 27,80 € en EL CORTE INGLES'), 2780, 'EL CORTE INGLES'],
  ['Unicaja', n('es.unicajabanco.app', 'Unicaja', 'Compra 9,95 EUR en LIDL con tarjeta 1111'), 995, 'LIDL'],
  ['Kutxabank', n('com.kutxabank.android', 'Kutxabank', 'Pago con tarjeta de 18,40 € en EROSKI'), 1840, 'EROSKI'],
  ['ABANCA', n('com.abanca.bancamovil', 'ABANCA', 'Compra de 6,00 € en GADIS con tu tarjeta'), 600, 'GADIS'],
  ['EVO', n('es.evobanco.bancamovil', 'EVO Banco', 'Pago de 22,00 € en DECATHLON'), 2200, 'DECATHLON'],
  ['Revolut', n('com.revolut.revolut', 'Mercadona', 'Pagado 14,35 € con •• 4242'), 1435, 'Mercadona'],
  ['N26', n('de.number26.android', 'N26', 'Pago de 7,90 € en NETFLIX.COM'), 790, 'NETFLIX.COM'],
  ['Google Wallet', n('com.google.android.apps.walletnfcrel', 'Mercadona', '23,40 € con Visa ••1234'), 2340, 'Mercadona'],
  ['Samsung Wallet', n('com.samsung.android.spay', 'DIA', 'Pago de 11,20 €'), 1120, 'DIA'],
  // Bancos que Taimo no conoce por nombre: se exige palabra de compra + pista de tarjeta.
  ['Banco desconocido (Ibercaja)', n('es.ibercaja.app.desconocida', 'Ibercaja', 'Compra con tarjeta ****9876 de 33,00 € en ALCAMPO'), 3300, 'ALCAMPO'],
  ['Banco desconocido (Cajamar)', n('com.cajamar.desconocida', 'Cajamar', 'Pago con su tarjeta terminada en 2222 por 5,50 EUR en BAR PEPE'), 550, 'BAR PEPE'],
  // SMS del banco, leídos desde el aviso de la app de mensajes (sin permiso de SMS).
  ['SMS banco', n(SMS, 'BBVA', 'BBVA: compra con tarjeta *1234 de 45,00 EUR en IKEA'), 4500, 'IKEA'],
  ['SMS Samsung', n(SAMSUNG_SMS, 'Santander', 'Santander: Compra con tarjeta 4321 por 19,99 EUR en PRIMARK'), 1999, 'PRIMARK'],
];

describe('detecta pagos de bancos y carteras en España (Android)', () => {
  it.each(PAYMENTS)('%s', (_name, notif, amount, merchant) => {
    const r = parse(notif);
    expect(r, JSON.stringify(notif)).not.toBeNull();
    expect(r!.amount).toBe(amount);
    expect(r!.currency).toBe('EUR');
    expect(r!.merchant.toLowerCase()).toContain(merchant.toLowerCase());
  });
});

const NOT_PAYMENTS: [string, RawNotification][] = [
  ['Bizum recibido', n('com.bbva.bbvacontigo', 'Bizum', 'Has recibido un Bizum de 20,00 € de Ana')],
  ['Transferencia recibida', n('es.bancosantander.apps', 'Santander', 'Has recibido una transferencia de 1.200,00 €')],
  ['Nómina', n('es.ingdirect.android', 'ING', 'Te han ingresado la nómina: 1.850,00 €')],
  ['Código de seguridad', n(SMS, 'BBVA', 'Tu código para confirmar la compra de 23,40 € es 123456. No lo compartas.')],
  ['Devolución', n('es.lacaixa.mobile.android.newwapicon', 'CaixaBank', 'Devolución de 15,30 € en ZARA en tu tarjeta')],
  ['Saldo', n('com.openbank.app', 'Openbank', 'Tu saldo disponible es 2.345,67 €')],
  ['Oferta', n(GMAIL, 'Zalando', 'Descuento de 10 € en tu próxima compra')],
  // Los correos no se leen (demasiada publicidad con importes): para eso están el aviso de la app y el SMS.
  ['Correo', n(GMAIL, 'CaixaBank', 'Compra con tarjeta: 64,20 € en LEROY MERLIN')],
  ['WhatsApp con importe', n('com.whatsapp', 'Lucía', 'Te debo 12,50 € de la cena')],
];

describe('no apunta lo que no es un gasto', () => {
  it.each(NOT_PAYMENTS)('%s', (_name, notif) => {
    expect(parse(notif)).toBeNull();
  });
});
