import { describe, expect, it } from 'vitest';

import { isUnusuallyLarge, typicalExpense } from '../src/domain/amountCheck';
import { duplicateNames, sameName } from '../src/domain/names';

describe('importes raros', () => {
  it('avisa con más de 10 veces lo normal o por encima del tope', () => {
    const history = [500, 800, 1200, 2000, 3000, 4500, 900, 1500];
    expect(typicalExpense(history)).toBe(3000);
    expect(isUnusuallyLarge(25000, history, 500000)).toBe(false);
    expect(isUnusuallyLarge(31000, history, 500000)).toBe(true);
    expect(isUnusuallyLarge(600000, [], 500000)).toBe(true);
    // Con pocos gastos aún no sabemos qué es lo normal.
    expect(isUnusuallyLarge(100000, [100, 200], 500000)).toBe(false);
  });
});

describe('nombres repetidos', () => {
  it('no distingue mayúsculas, tildes ni espacios', () => {
    expect(sameName(' Ána ', 'ana')).toBe(true);
    expect(sameName('Ana', 'Anabel')).toBe(false);
    expect(duplicateNames(['Ana', 'Luis', 'ana'])).toEqual(['ana']);
    expect(duplicateNames(['Ana', 'Luis'])).toEqual([]);
  });
});

describe('mesa: faltan por pagar', async () => {
  const { tableUnpaid } = await import('../src/domain/table');
  it('personas en la mesa menos quien pagó menos los avisos', () => {
    const group = {
      id: 'mesa-1',
      name: 'Cena',
      emoji: '🍽️',
      createdAt: '',
      members: [{ id: 'me', name: 'Yo', isMe: true }, { id: 'a', name: 'Ana' }],
      table: { id: '1', m: '', c: 'EUR', t: 'Yo', p: {}, i: [], n: 4, x: 8000 },
    };
    expect(tableUnpaid(group, [])).toBe(3);
    expect(tableUnpaid(group, [{ id: 's', groupId: 'mesa-1', from: 'a', to: 'me', amount: 2000, date: '' }])).toBe(2);
    expect(tableUnpaid({ ...group, table: undefined }, [])).toBe(0);
  });
});

describe('buscar moneda por país', async () => {
  const { countryIndex, currencyRegions, flagRegion, searchCurrencies } = await import('../src/fx/countries');
  it('la bandera dice el país y el euro tiene sus países', () => {
    expect(flagRegion('🇯🇵')).toBe('JP');
    expect(currencyRegions('JPY')).toEqual(['JP']);
    expect(currencyRegions('EUR')).toContain('DE');
  });
  it('«Japón», «alemania» o «Japan» encuentran su moneda', () => {
    const idx = countryIndex('es-ES');
    const find = (q: string) => searchCurrencies(q, (c) => c, idx);
    expect(find('Japón')).toContain('JPY');
    expect(find('japan')).toContain('JPY');
    expect(find('alemania')).toContain('EUR');
    expect(find('marruecos')).toContain('MAD');
  });
});

describe('días de datos para proponer presupuesto', async () => {
  const { historyDays, MIN_DAYS_FOR_BUDGET } = await import('../src/domain/dataSpan');
  it('cuenta desde el gasto más antiguo', () => {
    const today = new Date('2026-10-14T12:00:00');
    expect(historyDays([], today)).toBe(0);
    expect(historyDays([{ date: '2026-10-01T12:00:00' }, { date: '2026-10-10T12:00:00' }], today)).toBe(13);
    expect(historyDays([{ date: '2026-09-01T12:00:00' }], today)).toBeGreaterThanOrEqual(MIN_DAYS_FOR_BUDGET);
  });
});

describe('resumen de un mes sin terminar', async () => {
  const { monthRecap } = await import('../src/domain/insights');
  const ex = (d: Date, amount: number) => ({ id: `${d.getTime()}-${amount}`, amount, merchant: 'X', category: 'super' as const, date: d.toISOString(), source: 'manual' as const });
  it('compara con los mismos días del mes anterior', () => {
    const expenses = [ex(new Date(2026, 9, 5), 3000), ex(new Date(2026, 8, 5), 2000), ex(new Date(2026, 8, 25), 9000)];
    const r = monthRecap({ groups: [], budgets: {}, expenses }, new Date(2026, 9, 1), new Date(2026, 9, 14, 12));
    expect(r.partial).toBe(true);
    expect(r.previous).toBe(2000);
    const done = monthRecap({ groups: [], budgets: {}, expenses }, new Date(2026, 8, 1), new Date(2026, 9, 14, 12));
    expect(done.partial).toBe(false);
  });
});

describe('nombres del extracto del banco', async () => {
  const { cleanBankMerchant, rowsToExpenses } = await import('../src/domain/csv');
  it('quita «COMPRA TARJ.», «PAGO TARJETA», tarjetas, fechas y la ciudad del final', () => {
    expect(cleanBankMerchant('COMPRA TARJ. MERCADONA VALENCIA')).toBe('MERCADONA');
    expect(cleanBankMerchant('PAGO TARJETA ZARA MADRID ES')).toBe('ZARA');
    expect(cleanBankMerchant('COMPRA EN AMAZON')).toBe('AMAZON');
    expect(cleanBankMerchant('COMPRA TARJ. 5402XXXXXXXX1234 BAR MANOLO 12/10')).toBe('BAR MANOLO');
    expect(cleanBankMerchant('Kartenzahlung REWE 13.10.2026')).toBe('REWE');
  });
  it('lo que ya está bien se queda igual (y nunca se queda vacío)', () => {
    expect(cleanBankMerchant('NETFLIX.COM; SUSCRIPCION')).toBe('NETFLIX.COM; SUSCRIPCION');
    expect(cleanBankMerchant('Café Valencia')).toBe('Café Valencia');
    expect(cleanBankMerchant('VALENCIA')).toBe('VALENCIA');
    expect(cleanBankMerchant('COMPRA')).toBe('COMPRA');
  });
  it('al importar se usa el nombre limpio y su categoría', () => {
    const [e] = rowsToExpenses([{ date: '2026-10-13T12:00:00.000Z', merchant: 'COMPRA TARJ. MERCADONA VALENCIA', amount: 2340 }]);
    expect(e).toMatchObject({ merchant: 'MERCADONA', category: 'super' });
  });
});
