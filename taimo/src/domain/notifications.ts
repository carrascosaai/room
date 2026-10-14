import rules from '../../modules/taimo-capture/android/src/main/assets/taimo_payment_rules.json';

import type { CapturePayload } from './capture';
import { categorize } from './categorize';
import { parseAmount } from './money';
import type { CategoryId, Cents } from './types';

/**
 * Lector universal de avisos de pago. Las reglas (apps conocidas, palabras en
 * ~25 idiomas, símbolos y códigos de moneda) están en un JSON que comparten
 * esta función y el lector nativo de Android (TaimoNotificationListener.kt),
 * para que los dos decidan lo mismo.
 */

/** Lo que guarda el lector de notificaciones de Android (sin interpretar). */
export interface RawNotification {
  package: string;
  title: string;
  text: string;
  /** ISO 8601 */
  postedAt: string;
}

/** Bancos y carteras que conocemos por nombre (en el resto de apps se exige más). */
export const PAYMENT_APPS: Record<string, string> = rules.apps;
const WALLETS = new Set(rules.wallets);
const DENY = new Set(rules.deny);
const PURCHASE = new RegExp(rules.purchase, 'iu');
const NOT_PURCHASE = new RegExp(rules.notPurchase, 'iu');
/** Mensajes de dinero que te llega o que no son un pago: el aviso de «Paga tu parte», códigos… */
const NOT_SPENT = /mesa-pagado|te he pagado|i['’]ve paid you|paid you|\bc[oó]digo\b|\bcode\b|\bpin\b|\botp\b|contraseña/iu;
const BALANCE = new RegExp(`(${rules.balance})[^\\d]{0,25}$`, 'iu');
const CARD_HINT = new RegExp(rules.cardHint, 'iu');
const AMBIGUOUS: Record<string, string[]> = rules.ambiguous;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const SYMBOLS = new Map<string, string>(rules.symbols.map(([s, c]) => [s, c]));
for (const [word, code] of [
  ['euros', 'EUR'],
  ['euro', 'EUR'],
  ['eur', 'EUR'],
  ['dólares', 'USD'],
  ['dollars', 'USD'],
  ['kronor', 'SEK'],
  ['kroner', 'NOK'],
] as const) {
  SYMBOLS.set(word, code);
}
for (const code of rules.codes) SYMBOLS.set(code, code);
const TOKEN = [...SYMBOLS.keys()].sort((a, b) => b.length - a.length).map(escape).join('|');
/** 1.234,56 · 1,234.56 · 1 234,56 · 1'234.50 · 12,5 · 12.- · 3000 */
const NUM = "(?:\\d{1,2}(?:,\\d{2})+,\\d{3}|\\d{1,3}(?:[ \\u00a0\\u202f.,'’]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?(?:[.,]-)?";
const SYM_FIRST = new RegExp(`(${TOKEN})\\s?(-)?\\s?(${NUM})`, 'g');
const NUM_FIRST = new RegExp(`(-)?(${NUM})\\s?(${TOKEN})`, 'g');
const isLetter = (ch: string | undefined) => !!ch && /\p{L}/u.test(ch);

export interface Money {
  amount: Cents;
  currency: string;
  /** Texto tal cual aparece ("¥3,000", "12,40 €"). */
  raw: string;
  index: number;
}

/** "$" en México son pesos; "kr" en Noruega, coronas noruegas… */
function resolveCurrency(token: string, home: string): string {
  const options = AMBIGUOUS[token];
  if (options) return options.includes(home) ? home : options[0];
  return SYMBOLS.get(token) ?? SYMBOLS.get(token.toLowerCase()) ?? token;
}

/**
 * Todos los importes con moneda de un texto, en orden. Se saltan los saldos
 * ("Saldo disponible: 1.234 €") y los números de tarjeta ("**** 1234 EUR").
 */
export function findAllMoney(text: string, home = 'EUR'): Money[] {
  const found: Money[] = [];
  const push = (index: number, raw: string, token: string, num: string, numStart: number) => {
    const before = text[index - 1];
    const tokenStart = raw.indexOf(token) + index;
    const tokenEnd = tokenStart + token.length;
    // Los símbolos con letras ("kr", "Rs", "EUR") no pueden ir pegados a otras letras.
    if (isLetter(token[0]) && isLetter(text[tokenStart - 1])) return;
    if (isLetter(token[token.length - 1]) && isLetter(text[tokenEnd])) return;
    if (/[\d*xX•·]/.test(text[numStart - 1] ?? '')) return;
    if (/\d/.test(before ?? '')) return;
    if (BALANCE.test(text.slice(Math.max(0, index - 40), index))) return;
    const amount = parseAmount(num.replace(/[   '’]/g, '').replace(/[.,]-$/, ''));
    if (!amount) return;
    found.push({ amount, currency: resolveCurrency(token, home), raw: raw.trim(), index });
  };
  for (const m of text.matchAll(SYM_FIRST)) push(m.index!, m[0], m[1], m[3], m.index! + m[0].lastIndexOf(m[3]));
  for (const m of text.matchAll(NUM_FIRST)) push(m.index!, m[0], m[3], m[2], m.index! + m[0].indexOf(m[2]));
  return found.sort((a, b) => a.index - b.index).filter((m, i, all) => i === 0 || m.index >= all[i - 1].index + all[i - 1].raw.length);
}

export function findMoney(text: string, home = 'EUR'): Money | null {
  return findAllMoney(text, home)[0] ?? null;
}

const MERCHANT_PATTERNS = [
  // "en MERCADONA", "at Starbucks", "chez Carrefour", "bei REWE", "presso Esselunga", "em Pingo Doce", "bij Albert Heijn"…
  /(?:^|\s)(?:en|at|chez|bei|presso|em|bij|hos|w|u|в|στο|στην|to VPA|towards|merchant:?|info:?)\s+([^\n,;·|]+?)(?=\s+(?:con|com|with|avec|mit|on|am|op|på|dnia|el día|using|via\s+(?:apple|google|samsung|garmin|fitbit|paypal|nfc)|por|para|par|per|pour|für|for|was|is|in|has|have|using|del|from|kl|um|à|à las|a las|at \d)\b|\s+(?:el|le|il|on|am|op|em|o|den|der|the|du|del|de)\s+\d|\s+\d|\s*[,;·|]|\.(?=\s|$)|\s*$)/gimu,
  // "Starbucks · 4,50 €" / "MERCADONA - 12,40 €"
  /^([^\n·|]+?)\s*[·|–-]\s*(?=\S*\d)/mu,
];

/** Saca el comercio de frases típicas en muchos idiomas; si no, el título del aviso. */
function extractMerchant(title: string, text: string, raw: string): string | null {
  const full = `${title}\n${text}`.replace(raw, ' ');
  for (const re of MERCHANT_PATTERNS) {
    // Puede haber varios «en …» («terminada en 2222 … en BAR PEPE»): vale el primero que sea un nombre.
    const matches = re.global ? [...full.matchAll(re)] : [full.match(re)];
    for (const m of matches) {
      const candidate = m?.[1]?.trim();
      if (candidate && candidate.length >= 2 && /\p{L}/u.test(candidate) && !CARD_HINT.test(candidate) && !PURCHASE.test(candidate)) {
        return candidate.slice(0, 48);
      }
    }
  }
  // En Google Wallet el título suele ser el comercio y el texto el importe.
  const t = title.trim();
  if (t && !findMoney(t) && !PURCHASE.test(t) && !CARD_HINT.test(t)) return t.slice(0, 48);
  return null;
}

export interface ParseOptions {
  learned?: Record<string, CategoryId>;
  /** Tu moneda: resuelve "$" o "kr" y es la moneda por defecto. */
  home?: string;
  /** Nombre a usar si el aviso no dice el comercio. */
  defaultMerchant?: string;
  /** Apps que el usuario ha pedido ignorar. */
  ignored?: string[];
}

/**
 * Convierte una notificación de pago de cualquier banco, cartera o SMS del
 * mundo en un gasto, o null si no es un pago con tarjeta. En las apps que
 * conocemos basta con el importe y una palabra de pago; en cualquier otra
 * (incluidos los SMS del banco) se exige además una pista de tarjeta o cuenta.
 */
export function parsePaymentNotification(n: RawNotification, opts: ParseOptions = {}): (CapturePayload & { currency: string }) | null {
  if (DENY.has(n.package) || opts.ignored?.includes(n.package)) return null;
  const full = `${n.title}\n${n.text}`;
  if (NOT_PURCHASE.test(full)) return null;
  const money = findMoney(full, opts.home);
  if (!money) return null;
  const known = n.package in PAYMENT_APPS;
  if (known) {
    if (!WALLETS.has(n.package) && !PURCHASE.test(full)) return null;
  } else if (!PURCHASE.test(full) || !CARD_HINT.test(full)) {
    return null;
  }
  const merchant = extractMerchant(n.title, n.text, money.raw) ?? opts.defaultMerchant ?? 'Card payment';
  return {
    amount: money.amount,
    currency: money.currency,
    merchant,
    card: PAYMENT_APPS[n.package] ?? (n.title.trim().slice(0, 32) || undefined),
    category: categorize(merchant, opts.learned ?? {}),
    source: 'notificacion',
    date: n.postedAt,
    app: n.package,
  };
}

/**
 * Fecha escrita en el aviso («el 13/10/2026», «on 2026-10-13», «13.10.26»), como
 * 'YYYY-MM-DD'. Se lee día/mes/año (como en casi todo el mundo) salvo que el
 * segundo número no pueda ser un mes. Fechas imposibles o muy en el futuro: nada.
 */
export function findDate(text: string, now = new Date()): string | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const valid = (y: number, m: number, d: number) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    // Un pago no puede ser de dentro de más de un día (ni de hace más de 2 años).
    const ms = date.getTime() - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (ms > 86_400_000 || ms < -2 * 366 * 86_400_000) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };
  const iso = /(?:^|[^\d])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/.exec(text);
  if (iso) {
    const r = valid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (r) return r;
  }
  for (const m of text.matchAll(/(?:^|[^\d.,])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d])/g)) {
    let [a, b] = [Number(m[1]), Number(m[2])];
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (b > 12 && a <= 12) [a, b] = [b, a];
    const r = valid(y, b, a);
    if (r) return r;
  }
  return null;
}

/**
 * Texto pegado por el usuario (el aviso del banco, un SMS, un correo): como lo
 * pega a propósito, basta con encontrar un importe. Si además parece un pago
 * con tarjeta, se saca también el comercio y la categoría.
 */
export function parsePastedPayment(
  text: string,
  opts: ParseOptions & { now?: Date } = {},
): { amount: number; currency: string; merchant: string | null; category?: CategoryId; date?: string } | null {
  const clean = text.trim().slice(0, 600);
  if (!clean) return null;
  // La fecha del aviso, si la dice (si no, el gasto queda con la de hoy).
  const date = findDate(clean, opts.now) ?? undefined;
  const strict = parsePaymentNotification({ package: 'clipboard', title: '', text: clean, postedAt: new Date().toISOString() }, { ...opts, defaultMerchant: '' });
  if (strict) return { amount: strict.amount, currency: strict.currency, merchant: strict.merchant || null, category: strict.category, date };
  // Sin pinta de pago: si es dinero que te llega (devolución, Bizum recibido, nómina…) o un código, no es un gasto.
  if (NOT_PURCHASE.test(clean) || NOT_SPENT.test(clean)) return null;
  const money = findMoney(clean, opts.home);
  if (!money) return null;
  const [first, ...rest] = clean.split('\n');
  const merchant = extractMerchant(first, rest.join('\n'), money.raw);
  return { amount: money.amount, currency: money.currency, merchant, category: merchant ? categorize(merchant, opts.learned ?? {}) : undefined, date };
}

/**
 * El comercio tal como se pegó, pero sin gritar: «BURGER KING» → «Burger King».
 * Si ya viene con mayúsculas y minúsculas («McDonald's»), se deja igual.
 */
export function tidyMerchant(name: string): string {
  const s = name.trim();
  if (/\p{Ll}/u.test(s) || !/\p{Lu}/u.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s\-/&.(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
