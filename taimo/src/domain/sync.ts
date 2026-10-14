import type { AppState, CategoryId, Cents, Expense, Group, GroupKind, Member, OriginalAmount, PaymentInfo, ReceiptItem, Recurring, Settlement, SplitMode } from './types';

/**
 * Formato que se intercambia con el servidor para un grupo compartido.
 * Solo viajan los gastos del grupo: los gastos personales nunca salen del móvil.
 */
export interface RemoteMember {
  id: string;
  name: string;
  claimed: boolean;
  updatedAt: string;
  pay?: PaymentInfo | null;
}

export interface RemoteExpense {
  id: string;
  amount: Cents;
  merchant: string;
  category: CategoryId;
  date: string;
  paidBy: string;
  shares: Record<string, Cents>;
  note: string | null;
  source: Expense['source'];
  updatedAt: string;
  deleted: boolean;
  /** Reparto y moneda original (opcional, para no perder cómo se hizo el gasto). */
  extra?: { splitMode?: SplitMode; weights?: Record<string, number>; original?: OriginalAmount; items?: ReceiptItem[] } | null;
}

/** Ajustes del grupo que se comparten (gana el cambio más reciente). */
export interface RemoteGroupMeta {
  name: string;
  emoji: string;
  kind: GroupKind | null;
  currency: string | null;
  meta: { weights?: Record<string, number>; budget?: Cents; trip?: Group['trip']; recurring?: Recurring[]; pot?: boolean };
  updatedAt: string;
}

export interface RemoteSettlement {
  id: string;
  from: string;
  to: string;
  amount: Cents;
  date: string;
  updatedAt: string;
  deleted: boolean;
}

export interface GroupSnapshot {
  group: { id: string; name: string; emoji: string; code: string } & Partial<Omit<RemoteGroupMeta, 'name' | 'emoji'>>;
  members: RemoteMember[];
  expenses: RemoteExpense[];
  settlements: RemoteSettlement[];
}

export interface GroupPush {
  group?: RemoteGroupMeta;
  members: RemoteMember[];
  expenses: RemoteExpense[];
  settlements: RemoteSettlement[];
}

const EPOCH = '1970-01-01T00:00:00.000Z';

export function groupMeta(g: Group): RemoteGroupMeta {
  return {
    name: g.name,
    emoji: g.emoji,
    kind: g.kind ?? null,
    currency: g.currency ?? null,
    meta: { weights: g.weights, budget: g.budget, trip: g.trip, recurring: g.recurring, pot: g.pot },
    updatedAt: g.updatedAt ?? g.createdAt,
  };
}

/** Campos del grupo que vienen del servidor (si los trae). */
function metaFromSnapshot(sg: GroupSnapshot['group']): Partial<Group> {
  if (!sg.updatedAt) return {};
  return {
    kind: sg.kind ?? undefined,
    currency: sg.currency ?? undefined,
    weights: sg.meta?.weights,
    budget: sg.meta?.budget,
    trip: sg.meta?.trip,
    recurring: sg.meta?.recurring,
    pot: sg.meta?.pot,
    updatedAt: sg.updatedAt,
  };
}

/** Lo que este móvil envía al servidor para un grupo (incluidos los borrados pendientes). */
export function buildPush(state: AppState, groupId: string): GroupPush {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return { members: [], expenses: [], settlements: [] };
  const meta = groupMeta(group);
  const members: RemoteMember[] = group.members.map((m) => {
    const updatedAt = m.updatedAt ?? group.createdAt;
    // Tus datos de cobro salen de Ajustes; si los cambiaste después, ese cambio manda.
    const paymentAt = m.isMe ? state.profile?.paymentAt : undefined;
    return {
      id: m.id,
      name: m.name,
      claimed: Boolean(m.claimed || m.isMe),
      updatedAt: paymentAt && paymentAt > updatedAt ? paymentAt : updatedAt,
      pay: (m.isMe ? state.profile?.payment : m.pay) ?? null,
    };
  });
  const expenses: RemoteExpense[] = state.expenses
    .filter((e) => e.groupId === groupId && e.paidBy && e.shares)
    .map((e) => ({
      id: e.id,
      amount: e.amount,
      merchant: e.merchant,
      category: e.category,
      date: e.date,
      paidBy: e.paidBy!,
      shares: e.shares!,
      // La nota puede llevar el nombre de tu tarjeta: no la compartimos.
      note: null,
      source: e.source,
      updatedAt: e.updatedAt ?? e.date,
      deleted: false,
      extra: e.splitMode || e.weights || e.original || e.items ? { splitMode: e.splitMode, weights: e.weights, original: e.original, items: e.items } : null,
    }));
  const settlements: RemoteSettlement[] = state.settlements
    .filter((s) => s.groupId === groupId)
    .map((s) => ({ id: s.id, from: s.from, to: s.to, amount: s.amount, date: s.date, updatedAt: s.updatedAt ?? s.date, deleted: false }));

  for (const t of state.tombstones.filter((x) => x.groupId === groupId)) {
    const base = { id: t.id, amount: 0, date: t.deletedAt, updatedAt: t.deletedAt, deleted: true };
    if (t.kind === 'expense') {
      expenses.push({ ...base, merchant: '', category: 'otros', paidBy: '', shares: {}, note: null, source: 'manual' });
    } else {
      settlements.push({ ...base, from: '', to: '' });
    }
  }
  return { group: meta, members, expenses, settlements };
}

const newer = (a: string | undefined, b: string) => (a ?? EPOCH) > b;

/**
 * Aplica lo que devuelve el servidor. El servidor ya ha resuelto los conflictos
 * (gana el cambio más reciente), así que su versión manda, salvo lo que el
 * usuario haya tocado en este móvil mientras la sincronización estaba en curso.
 */
export function applySnapshot(
  state: AppState,
  groupId: string,
  snapshot: GroupSnapshot,
  syncStartedAt: string,
  now: string = new Date().toISOString(),
): AppState {
  const local = state.groups.find((g) => g.id === groupId);
  if (!local) return state;

  // Miembros
  const localMembers = new Map(local.members.map((m) => [m.id, m]));
  const members: Member[] = snapshot.members.map((r) => {
    const l = localMembers.get(r.id);
    if (l && newer(l.updatedAt, syncStartedAt)) return l;
    return { id: r.id, name: r.name, claimed: r.claimed, updatedAt: r.updatedAt, ...(r.pay ? { pay: r.pay } : {}), ...(l?.isMe ? { isMe: true } : {}) };
  });
  for (const l of local.members) {
    if (!snapshot.members.some((r) => r.id === l.id) && (l.isMe || newer(l.updatedAt, syncStartedAt))) members.push(l);
  }

  // Gastos del grupo
  const localExpenses = new Map(state.expenses.filter((e) => e.groupId === groupId).map((e) => [e.id, e]));
  const groupExpenses: Expense[] = [];
  const seen = new Set<string>();
  for (const r of snapshot.expenses) {
    seen.add(r.id);
    const l = localExpenses.get(r.id);
    if (l && newer(l.updatedAt, syncStartedAt)) {
      groupExpenses.push(l);
      continue;
    }
    if (r.deleted) continue;
    groupExpenses.push({
      id: r.id,
      amount: r.amount,
      merchant: r.merchant,
      category: r.category,
      date: r.date,
      source: r.source,
      groupId,
      paidBy: r.paidBy,
      shares: r.shares,
      // Conservamos la nota privada de este móvil (p. ej. la tarjeta) si la había.
      note: l?.note,
      updatedAt: r.updatedAt,
      ...(r.extra?.splitMode ? { splitMode: r.extra.splitMode } : {}),
      ...(r.extra?.weights ? { weights: r.extra.weights } : {}),
      ...(r.extra?.original ? { original: r.extra.original } : {}),
      ...(r.extra?.items ? { items: r.extra.items } : {}),
    });
  }
  for (const l of localExpenses.values()) {
    if (!seen.has(l.id) && newer(l.updatedAt, syncStartedAt)) groupExpenses.push(l);
  }

  // Liquidaciones
  const localSettlements = new Map(state.settlements.filter((s) => s.groupId === groupId).map((s) => [s.id, s]));
  const groupSettlements: Settlement[] = [];
  const seenS = new Set<string>();
  for (const r of snapshot.settlements) {
    seenS.add(r.id);
    const l = localSettlements.get(r.id);
    if (l && newer(l.updatedAt, syncStartedAt)) {
      groupSettlements.push(l);
      continue;
    }
    if (r.deleted) continue;
    groupSettlements.push({ id: r.id, groupId, from: r.from, to: r.to, amount: r.amount, date: r.date, updatedAt: r.updatedAt });
  }
  for (const l of localSettlements.values()) {
    if (!seenS.has(l.id) && newer(l.updatedAt, syncStartedAt)) groupSettlements.push(l);
  }

  // Borrados hechos aquí después de empezar la sincronización siguen ocultos.
  const pendingDeletes = new Set(
    state.tombstones.filter((t) => t.groupId === groupId && t.deletedAt > syncStartedAt).map((t) => t.id),
  );

  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            // Los ajustes que haya cambiado yo durante la sincronización no se pisan.
            ...(newer(g.updatedAt, syncStartedAt)
              ? {}
              : { name: snapshot.group.name, emoji: snapshot.group.emoji, ...metaFromSnapshot(snapshot.group) }),
            members,
            remote: { code: snapshot.group.code, lastSyncAt: now },
          }
        : g,
    ),
    expenses: [
      ...state.expenses.filter((e) => e.groupId !== groupId),
      ...groupExpenses.filter((e) => !pendingDeletes.has(e.id)),
    ].sort((a, b) => b.date.localeCompare(a.date)),
    settlements: [
      ...state.settlements.filter((s) => s.groupId !== groupId),
      ...groupSettlements.filter((s) => !pendingDeletes.has(s.id)),
    ],
    tombstones: state.tombstones.filter((t) => t.groupId !== groupId || t.deletedAt > syncStartedAt),
  };
}

/** Crea el grupo local a partir de una invitación aceptada. */
export function groupFromSnapshot(snapshot: GroupSnapshot, meMemberId: string, now: string = new Date().toISOString()) {
  return {
    group: {
      id: snapshot.group.id,
      name: snapshot.group.name,
      emoji: snapshot.group.emoji,
      createdAt: now,
      remote: { code: snapshot.group.code, lastSyncAt: now },
      ...metaFromSnapshot(snapshot.group),
      members: snapshot.members.map((m) => ({
        id: m.id,
        name: m.name,
        claimed: m.id === meMemberId ? true : m.claimed,
        updatedAt: m.id === meMemberId ? now : m.updatedAt,
        ...(m.pay ? { pay: m.pay } : {}),
        ...(m.id === meMemberId ? { isMe: true } : {}),
      })),
    },
  };
}
