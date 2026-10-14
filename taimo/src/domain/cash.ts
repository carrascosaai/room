import type { AppState, Cents, Expense, Group } from './types';

/** Una vez que sacaste dinero del cajero (no es un gasto: el dinero sigue siendo tuyo). */
export interface CashWithdrawal {
  id: string;
  amount: Cents;
  /** ISO */
  date: string;
}

/**
 * Monedero de efectivo. El saldo no se guarda tal cual: se calcula desde el último
 * recuento (`base` en `since`) sumando lo sacado del cajero y restando lo pagado en
 * efectivo después. Así, si borras un pago en efectivo, el monedero se corrige solo.
 */
export interface CashWallet {
  /** Lo que tenías en el último «¿Te cuadra?» (0 al empezar). */
  base: Cents;
  /** Cuándo se contó `base` (ISO). Solo cuenta lo posterior. */
  since: string;
  withdrawals: CashWithdrawal[];
  updatedAt: string;
}

/** Máximo de retiradas que se guardan. */
export const MAX_WITHDRAWALS = 200;

export const EMPTY_SINCE = '1970-01-01T00:00:00.000Z';

/** Si este gasto salió de tu monedero: pagado en efectivo y, si es de un grupo, lo pagaste tú. */
export function paidFromWallet(e: Expense, groups: Group[]): boolean {
  if (e.source !== 'efectivo') return false;
  if (!e.groupId) return true;
  const me = groups.find((g) => g.id === e.groupId)?.members.find((m) => m.isMe)?.id;
  return !!me && e.paidBy === me;
}

/** Lo que te queda en el monedero (puede salir negativo si no apuntaste lo que sacaste). */
export function cashBalance(state: Pick<AppState, 'expenses' | 'groups'> & Partial<Pick<AppState, 'cash'>>): Cents {
  const cash = state.cash;
  const since = cash?.since ?? EMPTY_SINCE;
  const added = (cash?.withdrawals ?? []).filter((w) => w.date > since).reduce((s, w) => s + w.amount, 0);
  const paid = state.expenses.filter((e) => e.date > since && paidFromWallet(e, state.groups)).reduce((s, e) => s + e.amount, 0);
  return (cash?.base ?? 0) + added - paid;
}

/** Monedero con una retirada más. */
export function withWithdrawal(cash: CashWallet | undefined, w: CashWithdrawal, now: string): CashWallet {
  const base = cash ?? { base: 0, since: EMPTY_SINCE, withdrawals: [], updatedAt: now };
  return { ...base, withdrawals: [w, ...base.withdrawals.filter((x) => x.id !== w.id)].slice(0, MAX_WITHDRAWALS), updatedAt: now };
}

/** «¿Te cuadra?»: lo que hay ahora en el monedero pasa a ser el punto de partida. */
export function adjusted(cash: CashWallet | undefined, balance: Cents, now: string): CashWallet {
  return { base: Math.max(0, balance), since: now, withdrawals: cash?.withdrawals ?? [], updatedAt: now };
}

/** Lo último que ha pasado en el monedero (retiradas y pagos), del más reciente al más antiguo. */
export function cashMovements(
  state: Pick<AppState, 'expenses' | 'groups'> & Partial<Pick<AppState, 'cash'>>,
  limit = 10,
): ({ kind: 'in'; withdrawal: CashWithdrawal; date: string } | { kind: 'out'; expense: Expense; date: string })[] {
  const ins = (state.cash?.withdrawals ?? []).map((w) => ({ kind: 'in' as const, withdrawal: w, date: w.date }));
  const outs = state.expenses.filter((e) => paidFromWallet(e, state.groups)).map((e) => ({ kind: 'out' as const, expense: e, date: e.date }));
  return [...ins, ...outs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
