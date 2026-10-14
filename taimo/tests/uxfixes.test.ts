import { describe, expect, it } from 'vitest';

import { translate, type Translation } from '../src/i18n/core';
import { currencyDecimals, parseTripDate, plainAmount } from '../src/domain/money';
import en from '../src/i18n/locales/en';
import es from '../src/i18n/locales/es';
import pl from '../src/i18n/locales/pl';
import { paymentLines } from '../src/ui/messages';

const EN = en as unknown as Translation;

describe('decimales según la moneda', () => {
  it('2 para euro, 0 para yen, 2 si no se conoce', () => {
    expect(currencyDecimals('EUR')).toBe(2);
    expect(currencyDecimals('JPY')).toBe(0);
    expect(currencyDecimals('???')).toBe(2);
    expect(plainAmount(1250, 'EUR')).toBe('12.50');
    expect(plainAmount(300000, 'JPY')).toBe('3000');
  });

  it('el enlace de PayPal no lleva decimales en yenes', () => {
    expect(paymentLines({ paypal: 'fer' }, 300000, 'JPY')).toEqual(['PayPal: https://paypal.me/fer/3000JPY']);
  });
});

describe('fechas de viaje', () => {
  it('acepta AAAA-MM-DD y DD/MM/AAAA; rechaza lo demás', () => {
    expect(parseTripDate('2026-11-15')).toBe('2026-11-15');
    expect(parseTripDate('15/11/2026')).toBe('2026-11-15');
    expect(parseTripDate('5.3.2027')).toBe('2027-03-05');
    expect(parseTripDate('')).toBe('');
    expect(parseTripDate('31/02/2026')).toBeNull();
    expect(parseTripDate('mañana')).toBeNull();
    expect(parseTripDate('11/15/2026')).toBeNull();
  });
});

describe('plurales nuevos', () => {
  it('días que quedan y veces', () => {
    expect(translate(es, EN, 'es-ES', 'home.perDay', { count: 1, amount: '5 €' })).toBe('Te queda 1 día: puedes gastar 5 € al día.');
    expect(translate(es, EN, 'es-ES', 'home.perDay', { count: 3, amount: '5 €' })).toBe('Te quedan 3 días: puedes gastar 5 € al día.');
    expect(translate(es, EN, 'es-ES', 'ants.line', { count: 1, monthly: 'a', yearly: 'b' })).toBe('1 vez · a al mes · b al año');
    expect(translate(pl, EN, 'pl-PL', 'home.perDay', { count: 5, amount: 'x' })).toBe('Zostało 5 dni: możesz wydawać x dziennie.');
  });
});
