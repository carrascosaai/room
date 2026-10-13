import { describe, expect, it } from 'vitest';

import { expensesToCsv, isAlreadyImported, parseBankCsv, parseDate } from '../src/domain/csv';
import { parsePaymentNotification } from '../src/domain/notifications';
import { applySnapshot, buildPush, type GroupSnapshot } from '../src/domain/sync';
import type { AppState, Group } from '../src/domain/types';
import { initialState, reducer } from '../src/store/store';

describe('CSV', () => {
  it('lee un extracto típico de banco español (cabecera tras líneas de titular)', () => {
    const csv = [
      'Titular;FERNANDO',
      'IBAN;ES00 0000 0000 0000',
      '',
      'Fecha;Concepto;Importe;Saldo',
      '13/10/2026;COMPRA TARJ. MERCADONA MADRID;-23,40;1.200,00',
      '12/10/2026;NOMINA OCTUBRE;1.500,00;1.223,40',
      '11/10/2026;"NETFLIX.COM; SUSCRIPCION";-12,99;-276,60',
    ].join('\n');
    const { expenses, skipped } = parseBankCsv(csv);
    expect(expenses).toHaveLength(2);
    expect(expenses[0]).toMatchObject({ amount: 2340, category: 'super', source: 'csv' });
    expect(expenses[0].date.slice(0, 10)).toBe('2026-10-13');
    expect(expenses[1]).toMatchObject({ amount: 1299, category: 'suscripciones', merchant: 'NETFLIX.COM; SUSCRIPCION' });
    expect(skipped).toBe(1);
  });

  it('acepta comas, fechas ISO y ficheros solo de gastos (importes positivos)', () => {
    const csv = 'date,description,amount\n2026-10-01,Decathlon,45.00\n2026-10-02,Renfe,12.30\n';
    const { expenses } = parseBankCsv(csv);
    expect(expenses.map((e) => [e.amount, e.category])).toEqual([
      [4500, 'deporte'],
      [1230, 'transporte'],
    ]);
  });

  it('interpreta fechas', () => {
    expect(parseDate('3/1/26')?.slice(0, 10)).toBe('2026-01-03');
    expect(parseDate('2026-12-31')?.slice(0, 10)).toBe('2026-12-31');
    expect(parseDate('31/13/2026')).toBeNull();
  });

  it('no importa dos veces lo mismo', () => {
    const csv = 'Fecha;Concepto;Importe\n13/10/2026;Bar Pepe;-5,00\n';
    const [e] = parseBankCsv(csv).expenses;
    expect(isAlreadyImported([{ ...e, id: 'x' }], e)).toBe(true);
  });

  it('exporta con punto y coma y coma decimal', () => {
    const out = expensesToCsv(
      [{ id: '1', amount: 1250, merchant: 'Bar "Pepe"', category: 'comer', date: '2026-10-13T10:00:00.000Z', source: 'manual' }],
      [],
      { header: ['Fecha', 'Comercio', 'Categoría', 'Importe total', 'Mi parte', 'Grupo', 'Origen', 'Nota'], category: () => 'Comer fuera' },
    );
    expect(out).toContain('Fecha;Comercio;Categoría');
    expect(out).toContain('2026-10-13;"Bar ""Pepe""";Comer fuera;12,50;12,50;;manual;');
  });
});

describe('notificaciones de Android', () => {
  const base = { postedAt: '2026-10-13T18:00:00.000Z' };

  it('Google Wallet: título = comercio, texto = importe', () => {
    const p = parsePaymentNotification({ ...base, package: 'com.google.android.apps.walletnfcrel', title: 'Mercadona', text: '12,40 €' });
    expect(p).toMatchObject({ amount: 1240, merchant: 'Mercadona', category: 'super', source: 'notificacion' });
  });

  it('banco: "Compra de 50,00 € en TICKETMASTER con tu tarjeta"', () => {
    const p = parsePaymentNotification({
      ...base,
      package: 'com.bbva.bbvacontigo',
      title: 'Compra con tarjeta',
      text: 'Compra de 50,00 € en TICKETMASTER con tu tarjeta ·1234',
    });
    expect(p).toMatchObject({ amount: 5000, merchant: 'TICKETMASTER', category: 'ocio', card: 'BBVA' });
  });

  it('Revolut en inglés', () => {
    const p = parsePaymentNotification({ ...base, package: 'com.revolut.revolut', title: 'Paid €8.50 at Starbucks', text: '' });
    expect(p).toMatchObject({ amount: 850, merchant: 'Starbucks', category: 'comer' });
  });

  it('ignora ingresos, Bizum recibidos y apps que no son de pago', () => {
    expect(parsePaymentNotification({ ...base, package: 'com.bbva.bbvacontigo', title: 'Has recibido un Bizum', text: '20,00 € de Ana' })).toBeNull();
    expect(parsePaymentNotification({ ...base, package: 'es.bancosantander.apps', title: 'Nómina', text: 'Ingreso de 1.500,00 €' })).toBeNull();
    expect(parsePaymentNotification({ ...base, package: 'com.whatsapp', title: 'Ana', text: 'Te debo 10 €' })).toBeNull();
    expect(parsePaymentNotification({ ...base, package: 'com.bbva.bbvacontigo', title: 'Tu saldo', text: 'Saldo disponible 300 €' })).toBeNull();
  });
});

describe('sincronización de grupos', () => {
  const group: Group = {
    id: 'g1',
    name: 'Piso',
    emoji: '🏠',
    createdAt: '2026-10-01T00:00:00.000Z',
    remote: { code: 'ABCDEFGHJKMNPQRS' },
    members: [
      { id: 'me', name: 'Yo', isMe: true, updatedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'ana', name: 'Ana', updatedAt: '2026-10-01T00:00:00.000Z' },
    ],
  };
  const state: AppState = {
    ...initialState,
    onboarded: true,
    groups: [group],
    expenses: [
      { id: 'p1', amount: 999, merchant: 'Personal', category: 'ocio', date: '2026-10-02T00:00:00.000Z', source: 'manual', note: 'Tarjeta: BBVA' },
      {
        id: 'e1', amount: 1000, merchant: 'Lidl', category: 'super', date: '2026-10-02T00:00:00.000Z', source: 'applepay',
        groupId: 'g1', paidBy: 'me', shares: { me: 500, ana: 500 }, note: 'Tarjeta: BBVA', updatedAt: '2026-10-02T00:00:00.000Z',
      },
    ],
  };

  it('solo envía los gastos del grupo, sin notas privadas ni quién es "yo"', () => {
    const push = buildPush(state, 'g1');
    expect(push.expenses.map((e) => e.id)).toEqual(['e1']);
    expect(push.expenses[0].note).toBeNull();
    expect(JSON.stringify(push)).not.toContain('isMe');
    expect(push.members.find((m) => m.id === 'me')?.claimed).toBe(true);
  });

  it('un borrado en un grupo compartido viaja como marca', () => {
    const after = reducer(state, { type: 'deleteExpense', id: 'e1' });
    expect(after.tombstones).toHaveLength(1);
    const push = buildPush(after, 'g1');
    expect(push.expenses).toEqual([expect.objectContaining({ id: 'e1', deleted: true })]);
  });

  it('aplica lo que devuelve el servidor sin tocar gastos personales y conservando "yo"', () => {
    const snapshot: GroupSnapshot = {
      group: { id: 'g1', name: 'Piso Lavapiés', emoji: '🏠', code: 'ABCDEFGHJKMNPQRS' },
      members: [
        { id: 'me', name: 'Yo', claimed: true, updatedAt: '2026-10-01T00:00:00.000Z' },
        { id: 'ana', name: 'Ana', claimed: true, updatedAt: '2026-10-03T00:00:00.000Z' },
      ],
      expenses: [
        { id: 'e1', amount: 1200, merchant: 'Lidl', category: 'super', date: '2026-10-02T00:00:00.000Z', paidBy: 'me', shares: { me: 600, ana: 600 }, note: null, source: 'applepay', updatedAt: '2026-10-03T00:00:00.000Z', deleted: false },
        { id: 'e2', amount: 3000, merchant: 'Luz', category: 'casa', date: '2026-10-03T00:00:00.000Z', paidBy: 'ana', shares: { me: 1500, ana: 1500 }, note: null, source: 'manual', updatedAt: '2026-10-03T00:00:00.000Z', deleted: false },
        { id: 'e3', amount: 1, merchant: 'x', category: 'otros', date: '2026-10-03T00:00:00.000Z', paidBy: 'ana', shares: {}, note: null, source: 'manual', updatedAt: '2026-10-03T00:00:00.000Z', deleted: true },
      ],
      settlements: [],
    };
    const next = applySnapshot(state, 'g1', snapshot, '2026-10-04T00:00:00.000Z');
    expect(next.groups[0].name).toBe('Piso Lavapiés');
    expect(next.groups[0].members.find((m) => m.id === 'me')?.isMe).toBe(true);
    expect(next.expenses.map((e) => e.id).sort()).toEqual(['e1', 'e2', 'p1']);
    expect(next.expenses.find((e) => e.id === 'e1')).toMatchObject({ amount: 1200, note: 'Tarjeta: BBVA' });
  });

  it('no pisa un cambio hecho en el móvil mientras se sincronizaba', () => {
    const edited = {
      ...state,
      expenses: state.expenses.map((e) => (e.id === 'e1' ? { ...e, amount: 7777, updatedAt: '2026-10-05T00:00:00.000Z' } : e)),
    };
    const snapshot: GroupSnapshot = {
      group: { id: 'g1', name: 'Piso', emoji: '🏠', code: 'ABCDEFGHJKMNPQRS' },
      members: [],
      expenses: [{ id: 'e1', amount: 1000, merchant: 'Lidl', category: 'super', date: '2026-10-02T00:00:00.000Z', paidBy: 'me', shares: { me: 500, ana: 500 }, note: null, source: 'applepay', updatedAt: '2026-10-02T00:00:00.000Z', deleted: false }],
      settlements: [],
    };
    const next = applySnapshot(edited, 'g1', snapshot, '2026-10-04T00:00:00.000Z');
    expect(next.expenses.find((e) => e.id === 'e1')?.amount).toBe(7777);
    // Y "yo" sigue en el grupo aunque el servidor aún no lo tenga.
    expect(next.groups[0].members.some((m) => m.isMe)).toBe(true);
  });

  it('unirse a un grupo trae sus gastos y te marca como miembro', () => {
    const snapshot: GroupSnapshot = {
      group: { id: 'g9', name: 'Viaje', emoji: '✈️', code: 'ZZZZZZZZZZZZZZZZ' },
      members: [{ id: 'ana', name: 'Ana', claimed: true, updatedAt: '2026-10-01T00:00:00.000Z' }],
      expenses: [{ id: 'v1', amount: 4000, merchant: 'Hotel', category: 'ocio', date: '2026-10-02T00:00:00.000Z', paidBy: 'ana', shares: { ana: 2000, luis: 2000 }, note: null, source: 'manual', updatedAt: '2026-10-02T00:00:00.000Z', deleted: false }],
      settlements: [],
    };
    const next = reducer(initialState, { type: 'joinGroup', snapshot, meMemberId: 'luis', newMemberName: 'Luis' });
    const g = next.groups.find((x) => x.id === 'g9')!;
    expect(g.members.find((m) => m.id === 'luis')).toMatchObject({ isMe: true, claimed: true });
    expect(next.expenses.map((e) => e.id)).toEqual(['v1']);
  });
});
