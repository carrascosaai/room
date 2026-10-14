import { categorize, normalizeMerchant } from './categorize';
import { isCategoryId } from './categories';
import { parseAmount } from './money';
import { findMoney } from './notifications';
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
  /** Moneda del pago (si no es la tuya, se convierte al guardarlo). */
  currency?: string;
  /** App de Android que avisó del pago. */
  app?: string;
}

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseCaptureParams(
  params: Params,
  learned: Record<string, CategoryId> = {},
  now: Date = new Date(),
  defaultMerchant = 'Card payment',
  home = 'EUR',
): CapturePayload | null {
  // Wallet manda el importe ya formateado en la moneda del pago: "¥3,000", "$12.34", "12,34 €".
  const rawAmount = first(params.amount) ?? '';
  const money = findMoney(rawAmount, home);
  const amount = money?.amount ?? parseAmount(rawAmount);
  if (amount === null || amount === 0) return null;
  const currencyParam = first(params.currency)?.trim().toUpperCase();
  const merchant = (first(params.merchant) ?? '').trim() || defaultMerchant;
  const requested = first(params.category);
  const sourceParam = first(params.source);
  return {
    amount,
    merchant,
    card: first(params.card)?.trim() || undefined,
    category: isCategoryId(requested) ? requested : categorize(merchant, learned),
    source: sourceParam === 'notificacion' ? 'notificacion' : 'applepay',
    date: now.toISOString(),
    currency: currencyParam && /^[A-Z]{3}$/.test(currencyParam) ? currencyParam : money?.currency ?? home,
  };
}

/** Ventana para considerar que dos capturas iguales son el mismo pago. */
const DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

/**
 * El mismo pago puede llegar dos veces: el Atajo que se dispara doble, o en
 * Android el aviso de Google Wallet y el del banco a la vez (con el comercio
 * escrito distinto). Mismo importe en pocos minutos y comercio parecido, o
 * ambos automáticos, es el mismo pago.
 */
export function findDuplicate(expenses: Expense[], payload: CapturePayload): Expense | undefined {
  const t = new Date(payload.date).getTime();
  const a = normalizeMerchant(payload.merchant);
  return expenses.find((e) => {
    const sameAmount = e.original && payload.currency && e.original.currency === payload.currency ? e.original.amount === payload.amount : e.amount === payload.amount;
    if (!sameAmount || Math.abs(new Date(e.date).getTime() - t) >= DUPLICATE_WINDOW_MS) return false;
    const b = normalizeMerchant(e.merchant);
    const similar = a === b || (a.length >= 3 && b.includes(a)) || (b.length >= 3 && a.includes(b));
    const bothAuto = e.source !== 'manual' && e.source !== 'csv' && e.source !== 'fijo';
    return similar || bothAuto;
  });
}
