import { categorize } from './categorize';
import { isCategoryId } from './categories';
import { parseAmount } from './money';
import type { CategoryId, Cents, Expense, ExpenseSource } from './types';

/**
 * Datos que llegan desde fuera de la app: un Atajo de iOS con el disparador
 * "Transacción" de Wallet abre `taimo://capture?amount=…&merchant=…&card=…`.
 * En Android, más adelante, el lector de notificaciones enviará lo mismo.
 */
export interface CapturePayload {
  amount: Cents;
  merchant: string;
  card?: string;
  category: CategoryId;
  source: ExpenseSource;
  date: string;
}

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseCaptureParams(
  params: Params,
  learned: Record<string, CategoryId> = {},
  now: Date = new Date(),
): CapturePayload | null {
  const amount = parseAmount(first(params.amount));
  if (amount === null || amount === 0) return null;
  const merchant = (first(params.merchant) ?? '').trim() || 'Pago con tarjeta';
  const requested = first(params.category);
  const sourceParam = first(params.source);
  return {
    amount,
    merchant,
    card: first(params.card)?.trim() || undefined,
    category: isCategoryId(requested) ? requested : categorize(merchant, learned),
    source: sourceParam === 'notificacion' ? 'notificacion' : 'applepay',
    date: now.toISOString(),
  };
}

/** Ventana para considerar que dos capturas iguales son el mismo pago. */
const DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

/**
 * Los Atajos a veces se disparan dos veces para el mismo pago. Si ya hay un
 * gasto con el mismo importe y comercio en los últimos minutos, lo devolvemos.
 */
export function findDuplicate(expenses: Expense[], payload: CapturePayload): Expense | undefined {
  const t = new Date(payload.date).getTime();
  return expenses.find(
    (e) =>
      e.amount === payload.amount &&
      e.merchant.toLowerCase() === payload.merchant.toLowerCase() &&
      Math.abs(new Date(e.date).getTime() - t) < DUPLICATE_WINDOW_MS,
  );
}
