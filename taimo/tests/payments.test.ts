import { describe, expect, it } from 'vitest';

import { findDuplicate, parseCaptureParams } from '../src/domain/capture';
import { findAllMoney, findMoney, parsePaymentNotification, type RawNotification } from '../src/domain/notifications';
import type { Expense } from '../src/domain/types';
import { expenseFromCapture, initialState } from '../src/store/store';

const at = '2026-10-14T10:00:00.000Z';
const n = (pkg: string, title: string, text: string): RawNotification => ({ package: pkg, title, text, postedAt: at });
const SMS = 'com.google.android.apps.messaging';

describe('importes en cualquier moneda', () => {
  it.each([
    ['Pago de 12,40 € en MERCADONA', 'EUR', 1240, 'EUR'],
    ['You spent $12.34 at Starbucks', 'EUR', 1234, 'USD'],
    ['You spent $250.00 at OXXO', 'MXN', 25000, 'MXN'],
    ['¥3,000 ファミリーマート', 'EUR', 300000, 'JPY'],
    ['Compra aprobada R$ 45,90 em PADARIA', 'BRL', 4590, 'BRL'],
    ['Płatność kartą 1 234,56 zł w BIEDRONKA', 'PLN', 123456, 'PLN'],
    ['Rs.1,23,456.00 debited from A/c XX1234', 'INR', 12345600, 'INR'],
    ['₹500 spent on card', 'EUR', 50000, 'INR'],
    ['Kortköp 89,50 kr ICA Maxi', 'SEK', 8950, 'SEK'],
    ['Kortkjøp 89,50 kr REMA 1000', 'NOK', 8950, 'NOK'],
    ['Zahlung CHF 12.- Migros', 'CHF', 1200, 'CHF'],
    ['Card payment GBP 7.20 Pret', 'EUR', 720, 'GBP'],
    ['Harcama 150,00 TL Migros', 'TRY', 15000, 'TRY'],
    ['카드 승인 12,000원 GS25', 'KRW', 1200000, 'KRW'],
    ['Покупка 1 250,00 ₽ Пятёрочка', 'RUB', 125000, 'RUB'],
  ])('%s', (text, home, amount, currency) => {
    const m = findMoney(text, home)!;
    expect([m.amount, m.currency]).toEqual([amount, currency]);
  });

  it('salta saldos y números de tarjeta', () => {
    expect(findMoney('Tarjeta ****1234 EUR 12,50 Mercadona')).toMatchObject({ amount: 1250 });
    expect(findAllMoney('Compra 12,40 € en LIDL. Saldo disponible: 1.234,00 €').map((m) => m.amount)).toEqual([1240]);
    expect(findMoney('Llámanos al 900 123 456')).toBeNull();
    expect(findMoney('TOP 10 ofertas')).not.toBeNull(); // parece moneda (TOP), por eso además se exigen palabras de pago
  });
});

describe('avisos de bancos y carteras de todo el mundo', () => {
  it('Google Wallet: título = comercio', () => {
    const p = parsePaymentNotification(n('com.google.android.apps.walletnfcrel', 'Mercadona', '12,40 € con Visa ••4321'))!;
    expect(p).toMatchObject({ amount: 1240, currency: 'EUR', merchant: 'Mercadona', card: 'Google Wallet' });
  });

  it.each([
    ['com.bbva.bbvacontigo', 'BBVA', 'Pago con tarjeta de 23,50 € en ZARA ESPAÑA', 2350, 'EUR', 'ZARA ESPAÑA', 'EUR'],
    ['com.chase.sig.android', 'Chase', 'You made a $45.67 transaction with AMAZON.COM', 4567, 'USD', null, 'USD'],
    ['com.chase.sig.android', 'Card used', 'A $18.20 charge at Chipotle was made on your card ending in 1234', 1820, 'USD', 'Chipotle', 'USD'],
    ['com.nu.production', 'Compra aprovada', 'Compra de R$ 32,90 APROVADA em IFOOD para o cartão final 1234', 3290, 'BRL', 'IFOOD', 'BRL'],
    ['com.revolut.revolut', 'Paid ¥1,200', 'at Lawson in Tokyo', 120000, 'JPY', 'Lawson', 'EUR'],
    ['fr.creditagricole.androidapp', 'Paiement carte', 'Paiement de 8,90 € chez MONOPRIX', 890, 'EUR', 'MONOPRIX', 'EUR'],
    ['com.starfinanz.smob.android.sfinanzstatus', 'Kartenzahlung', 'Zahlung über 54,20 EUR bei REWE', 5420, 'EUR', 'REWE', 'EUR'],
    ['pl.pkobp.iko', 'Płatność kartą', 'Transakcja kartą 45,00 PLN w ŻABKA', 4500, 'PLN', 'ŻABKA', 'PLN'],
    ['com.phonepe.app', 'Paid', '₹250 paid to Swiggy', 25000, 'INR', null, 'INR'],
  ])('%s', (pkg, title, text, amount, currency, merchant, home) => {
    const p = parsePaymentNotification(n(pkg, title, text), { home, defaultMerchant: 'Pago con tarjeta' })!;
    expect(p).not.toBeNull();
    expect([p.amount, p.currency]).toEqual([amount, currency]);
    if (merchant) expect(p.merchant).toBe(merchant);
  });

  it('SMS del banco (cualquier país) con pista de tarjeta o cuenta', () => {
    const india = parsePaymentNotification(n(SMS, 'HDFCBK', 'Rs.500.00 debited from A/c XX1234 on 12-10-26 to VPA zomato@hdfcbank'), { home: 'INR' })!;
    expect(india).toMatchObject({ amount: 50000, currency: 'INR', merchant: 'zomato@hdfcbank' });
    const mx = parsePaymentNotification(n(SMS, 'BBVA', 'Compra con tarjeta *4321 por $350.00 MXN en WALMART'), { home: 'MXN' })!;
    expect(mx).toMatchObject({ amount: 35000, currency: 'MXN', merchant: 'WALMART' });
  });

  it('ignora lo que no es un gasto', () => {
    const none = [
      n('com.bbva.bbvacontigo', 'Bizum recibido', 'Has recibido 20,00 € de Ana'),
      n('com.chase.sig.android', 'Deposit', 'A $1,200.00 direct deposit was credited'),
      n('com.nu.production', 'Estorno', 'Estorno de R$ 30,00 da compra em IFOOD'),
      n(SMS, 'VISA', 'Your OTP for the card ending 1234 is 482913 for $20.00'),
      n('com.revolut.revolut', 'Card declined', 'Payment of €12.00 at Uber was declined'),
      n(SMS, 'Ana', 'Te debo 20 € de la cena'), // SMS sin tarjeta
      n('com.whatsapp', 'Ana', 'He pagado 30 € con la tarjeta'), // apps de mensajes: nunca
      n('com.amazon.mShop.android.shopping', 'Oferta', 'Ahorra 20 € en auriculares'),
      n('com.santander.app', 'Saldo', 'Saldo disponible en tu cuenta: 1.234,00 €'),
    ];
    for (const x of none) expect(parsePaymentNotification(x), `${x.title}: ${x.text}`).toBeNull();
  });

  it('respeta las apps que ignoras', () => {
    const x = n('com.chase.sig.android', 'Card', 'You spent $5.00 at 7-Eleven');
    expect(parsePaymentNotification(x)).not.toBeNull();
    expect(parsePaymentNotification(x, { ignored: ['com.chase.sig.android'] })).toBeNull();
  });
});

describe('capturas en otra moneda y duplicados', () => {
  it('Wallet en Japón: el Atajo manda "¥3,000" y se guarda en euros con el cambio', () => {
    const p = parseCaptureParams({ amount: '¥3,000', merchant: 'Lawson' }, {}, new Date(at))!;
    expect(p).toMatchObject({ amount: 300000, currency: 'JPY' });
    const { expense } = expenseFromCapture(initialState, p);
    expect(expense.original).toMatchObject({ amount: 300000, currency: 'JPY' });
    expect(expense.amount).toBeGreaterThan(1000);
    expect(expense.amount).toBeLessThan(3000);
  });

  it('el aviso de Wallet y el del banco del mismo pago cuentan una vez', () => {
    const wallet = parsePaymentNotification(n('com.google.android.apps.walletnfcrel', 'Mercadona', '12,40 €'))!;
    const bank = parsePaymentNotification(n('com.bbva.bbvacontigo', 'BBVA', 'Pago con tarjeta de 12,40 € en MERCADONA VALENCIA'))!;
    const { expense } = expenseFromCapture(initialState, wallet);
    expect(findDuplicate([expense as Expense], bank)).toBe(expense);
  });
});
