import { categorize } from './categorize';
import { parseAmount } from './money';
import type { CapturePayload } from './capture';
import type { CategoryId } from './types';

/** Lo que guarda el lector de notificaciones de Android (sin interpretar). */
export interface RawNotification {
  package: string;
  title: string;
  text: string;
  /** ISO 8601 */
  postedAt: string;
}

/**
 * Apps cuyas notificaciones de pago leemos. Solo estas: el resto se ignora en el
 * propio móvil. (Los identificadores de algunos bancos hay que confirmarlos en
 * un dispositivo real.)
 */
export const PAYMENT_APPS: Record<string, string> = {
  'com.google.android.apps.walletnfcrel': 'Google Wallet',
  'com.samsung.android.spay': 'Samsung Wallet',
  'com.revolut.revolut': 'Revolut',
  'de.number26.android': 'N26',
  'com.bbva.bbvacontigo': 'BBVA',
  'es.bancosantander.apps': 'Santander',
  'es.lacaixa.mobile.android.newwapicon': 'CaixaBank',
  'com.imaginbank.app': 'imagin',
  'es.ingdirect.android': 'ING',
  'com.openbank.app': 'Openbank',
  'net.inverline.bancosabadell.officelocator.android': 'Sabadell',
  'es.bankinter.bankingapp': 'Bankinter',
};

const AMOUNT_RE = /(?:€\s?-?\d[\d.,]*|-?\d[\d.,]*\s?(?:€|eur\b|euros?\b))/i;

// Avisos que llevan importe pero no son un gasto con tarjeta.
const NOT_A_PURCHASE = /(recibid|ingres|transferencia recibida|has recibido|abono|devoluci|reembolso|nómina|nomina|saldo disponible|te han enviado|bizum recibido)/i;
const PURCHASE_HINT = /(pago|pagado|compra|cargo|has gastado|transacci|tarjeta|card|paid|spent)/i;

/** Saca el comercio de frases típicas: "Pago de 12,40 € en MERCADONA", "12,40 € at Starbucks". */
function extractMerchant(title: string, text: string, amountMatch: string): string {
  const full = `${title}\n${text}`;
  const patterns = [
    /\b(?:en|at|a)\s+([^\n.,·|]+?)(?:\s+con\s+|\s+con tu|\s+el día|\s+\d|\.|,|$)/im,
    /([^\n]+?)\s*[·|-]\s*-?\d[\d.,]*\s?€/,
  ];
  for (const re of patterns) {
    const m = full.replace(amountMatch, ' ').trim().match(re);
    const candidate = m?.[1]?.trim();
    if (candidate && candidate.length >= 2 && !/^(tu|la|el|una?)\b/i.test(candidate)) return candidate;
  }
  // En Google Wallet el título suele ser el comercio y el texto el importe.
  if (title && !AMOUNT_RE.test(title) && !PURCHASE_HINT.test(title)) return title.trim();
  return 'Pago con tarjeta';
}

/**
 * Convierte una notificación de pago en un gasto, o null si no es un pago.
 */
export function parsePaymentNotification(
  n: RawNotification,
  learned: Record<string, CategoryId> = {},
): CapturePayload | null {
  if (!(n.package in PAYMENT_APPS)) return null;
  const full = `${n.title} ${n.text}`;
  if (NOT_A_PURCHASE.test(full)) return null;
  const match = full.match(AMOUNT_RE);
  if (!match) return null;
  // Google Wallet no dice "pago": basta con el importe. Los bancos avisan de muchas cosas, así que pedimos una pista.
  const isWallet = n.package === 'com.google.android.apps.walletnfcrel' || n.package === 'com.samsung.android.spay';
  if (!isWallet && !PURCHASE_HINT.test(full)) return null;
  const amount = parseAmount(match[0]);
  if (!amount) return null;
  const merchant = extractMerchant(n.title, n.text, match[0]);
  return {
    amount,
    merchant,
    card: PAYMENT_APPS[n.package],
    category: categorize(merchant, learned),
    source: 'notificacion',
    date: n.postedAt,
  };
}
