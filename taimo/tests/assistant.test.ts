import { describe, expect, it } from 'vitest';

import { answer } from '../src/domain/assistant';
import type { AppState, Expense } from '../src/domain/types';
import es from '../src/i18n/locales/es';
import { initialState } from '../src/store/store';

// Un i18n mínimo en español para comprobar las respuestas.
const get = (key: string) => key.split('.').reduce<any>((o, k) => o?.[k], es);
const i18n = {
  lang: 'es',
  locale: 'es-ES',
  currency: 'EUR',
  t: (key: string, p: Record<string, unknown> = {}) => String(get(key) ?? key).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? '')),
  money: (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`,
  date: (d: Date | string, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString('es-ES', o),
} as any;

let n = 0;
const e = (m: number, d: number, amount: number, merchant: string, category: Expense['category']): Expense => ({
  id: `a${n++}`,
  amount,
  merchant,
  category,
  date: new Date(2026, m, d, 12).toISOString(),
  source: 'manual',
});
const state: AppState = {
  ...initialState,
  budgets: { super: 30000, comer: 20000 },
  expenses: [
    e(9, 2, 2350, 'Glovo', 'comer'),
    e(9, 9, 1800, 'Glovo', 'comer'),
    e(9, 5, 6400, 'Mercadona', 'super'),
    e(8, 20, 9900, 'Zara', 'compras'),
    e(3, 3, 1500, 'Glovo', 'comer'),
  ],
};
const today = new Date(2026, 9, 14, 18);
const ask = (q: string) => answer(q, { state, i18n, today }).join(' ');

describe('asistente', () => {
  it('cuánto en un comercio y un periodo', () => {
    expect(ask('¿Cuánto gasté en Glovo este año?')).toBe('Este año: 56,50 € en Glovo. Gastos: 3.');
    expect(ask('cuanto gaste en glovo este mes')).toContain('41,50 €');
  });
  it('por categoría con sinónimos', () => {
    expect(ask('¿Cuánto gasté en comida este mes?')).toContain('Este mes: 41,50 € en Comer fuera');
  });
  it('en qué gasto más y mayor gasto', () => {
    expect(ask('¿En qué gasto más?')).toContain('Supermercado: 64,00 €');
    expect(ask('mayor gasto del mes pasado')).toContain('Zara, 99,00 €');
  });
  it('¿puedo permitirme…?', () => {
    expect(ask('¿Puedo permitirme 100 € este mes?')).toMatch(/^Sí/);
    expect(ask('¿Puedo permitirme 2000 € en diciembre?')).toMatch(/^Justo no/);
  });
  it('en inglés también', () => {
    expect(ask('How much did I spend on Glovo this year?')).toContain('56,50 €');
  });
  it('sin entender, ayuda', () => {
    expect(answer('', { state, i18n, today })[0]).toContain('No te he entendido');
  });
});
