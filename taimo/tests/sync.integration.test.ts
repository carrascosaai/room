/// <reference types="node" />
/**
 * Dos móviles sincronizando a través de las funciones SQL reales.
 * Necesita un Postgres con la migración aplicada y los roles `anon`/`authenticated`:
 *   TAIMO_PG="-h /tmp -p 5499 -U postgres" npx vitest run tests/sync.integration.test.ts
 * Sin la variable TAIMO_PG, se salta.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { balances } from '../src/domain/groups';
import { buildPush, type GroupPush, type GroupSnapshot } from '../src/domain/sync';
import type { AppState } from '../src/domain/types';
import { initialState, reducer } from '../src/store/store';

const PG = process.env.TAIMO_PG;

function call(sql: string, vars: Record<string, string>): GroupSnapshot {
  const args = [...(PG ?? '').split(' ').filter(Boolean), '-X', '-At', '-v', 'ON_ERROR_STOP=1'];
  for (const [k, v] of Object.entries(vars)) args.push('-v', `${k}=${v}`);
  const out = execFileSync('psql', args, { input: `set role anon;\n${sql};\n`, encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop()!);
}

const server = {
  create(state: AppState, groupId: string) {
    const g = state.groups.find((x) => x.id === groupId)!;
    const p = buildPush(state, groupId);
    return call(
      "select public.taimo_create_group(:'id', :'name', :'emoji', :'m'::jsonb, :'e'::jsonb, :'s'::jsonb)",
      { id: g.id, name: g.name, emoji: g.emoji, ...vars(p) },
    );
  },
  join(code: string) {
    return call("select public.taimo_join(:'code')", { code });
  },
  sync(code: string, push: GroupPush) {
    return call("select public.taimo_sync(:'code', :'m'::jsonb, :'e'::jsonb, :'s'::jsonb)", { code, ...vars(push) });
  },
};

function vars(p: GroupPush) {
  return { m: JSON.stringify(p.members), e: JSON.stringify(p.expenses), s: JSON.stringify(p.settlements) };
}

function syncPhone(state: AppState, groupId: string): AppState {
  const g = state.groups.find((x) => x.id === groupId)!;
  const started = new Date().toISOString();
  const snapshot = server.sync(g.remote!.code, buildPush(state, groupId));
  return reducer(state, { type: 'applySnapshot', groupId, snapshot, syncStartedAt: started });
}

describe.skipIf(!PG)('sincronización real entre dos móviles', () => {
  it('Ana crea el piso, Luis se une, ambos añaden gastos y los saldos coinciden', () => {
    const gid = `g-${Date.now()}`;
    // Móvil de Ana
    let ana: AppState = reducer(initialState, {
      type: 'addGroup',
      group: {
        id: gid,
        name: 'Piso',
        emoji: '🏠',
        createdAt: new Date().toISOString(),
        members: [
          { id: `${gid}-ana`, name: 'Ana', isMe: true },
          { id: `${gid}-luis`, name: 'Luis' },
        ],
      },
    });
    ana = reducer(ana, {
      type: 'addExpense',
      expense: {
        id: `${gid}-e1`, amount: 6000, merchant: 'Mercadona', category: 'super', date: new Date().toISOString(),
        source: 'applepay', groupId: gid, paidBy: `${gid}-ana`, shares: { [`${gid}-ana`]: 3000, [`${gid}-luis`]: 3000 },
      },
    });
    const created = server.create(ana, gid);
    ana = reducer(ana, { type: 'applySnapshot', groupId: gid, snapshot: created, syncStartedAt: new Date().toISOString() });
    const code = ana.groups[0].remote!.code;
    expect(code).toMatch(/^[A-Z2-9]{16}$/);

    // Móvil de Luis: se une eligiendo "Luis"
    let luis: AppState = reducer(initialState, { type: 'joinGroup', snapshot: server.join(code), meMemberId: `${gid}-luis` });
    expect(luis.expenses).toHaveLength(1);
    luis = reducer(luis, {
      type: 'addExpense',
      expense: {
        id: `${gid}-e2`, amount: 4000, merchant: 'Iberdrola', category: 'casa', date: new Date().toISOString(),
        source: 'manual', groupId: gid, paidBy: `${gid}-luis`, shares: { [`${gid}-ana`]: 2000, [`${gid}-luis`]: 2000 },
      },
    });
    luis = syncPhone(luis, gid);
    ana = syncPhone(ana, gid);

    // Luis aparece como reclamado para Ana, y los dos ven lo mismo.
    expect(ana.groups[0].members.find((m) => m.id === `${gid}-luis`)?.claimed).toBe(true);
    expect(ana.expenses.map((e) => e.id).sort()).toEqual(luis.expenses.map((e) => e.id).sort());
    const bAna = balances(ana.groups[0], ana.expenses, ana.settlements);
    const bLuis = balances(luis.groups[0], luis.expenses, luis.settlements);
    expect(bAna).toEqual(bLuis);
    expect(bAna[`${gid}-ana`]).toBe(1000); // Ana pagó 60, le tocan 50: le deben 10 €

    // Luis paga lo que debe y Ana borra un gasto: ambos cambios llegan al otro.
    luis = reducer(luis, {
      type: 'addSettlement',
      settlement: { id: `${gid}-s1`, groupId: gid, from: `${gid}-luis`, to: `${gid}-ana`, amount: 1000, date: new Date().toISOString() },
    });
    luis = syncPhone(luis, gid);
    ana = syncPhone(ana, gid);
    expect(Object.values(balances(ana.groups[0], ana.expenses, ana.settlements)).every((v) => v === 0)).toBe(true);

    ana = reducer(ana, { type: 'deleteExpense', id: `${gid}-e2` });
    ana = syncPhone(ana, gid);
    expect(ana.tombstones).toHaveLength(0);
    luis = syncPhone(luis, gid);
    expect(luis.expenses.map((e) => e.id)).toEqual([`${gid}-e1`]);
  });
});
