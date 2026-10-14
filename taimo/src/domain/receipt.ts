import { parseDate } from './csv';
import { findAllMoney } from './notifications';
import { parseAmount } from './money';
import type { Cents } from './types';

/** Una línea leída de la foto con su posición (0..1, desde arriba a la izquierda). */
export interface OcrLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReceiptData {
  merchant: string;
  total: Cents | null;
  currency: string;
  /** ISO, si el ticket trae fecha. */
  date: string | null;
  items: { name: string; amount: Cents }[];
}

// «Total», «Importe», «A pagar»… en los idiomas de la app.
const TOTAL = /(^|\s)(total|importe|a pagar|totale|summe|gesamt|zu zahlen|montant|net a payer|totaal|te betalen|totalt|att betala|i alt|yhteensa|razem|suma|do zaplaty|celkem|toplam|итого|сума|всього|σύνολο|amount due|balance due|grand total|sum)(?=\s|:|$)/iu;
const NOT_TOTAL = /(subtotal|sub total|base|iva|vat|tax|mwst|tva|btw|moms|alv|vsk|kdv|ндс|пдв|propina|tip|cambio|change|wechselgeld|rendu|efectivo|cash|bar\b|entregado|tarjeta|card|karte|carte|ahorro|descuento|discount|rabatt|remise|puntos|points)/iu;
const SKIP_MERCHANT = /(cif|nif|vat|tel|tfno|www|http|@|factura|ticket|invoice|receipt|recibo|fecha|date|hora|caja|cashier|^\d)/iu;

/** Junta en filas las líneas que están a la misma altura («Café ··· 2,50»). */
export function toRows(lines: OcrLine[]): string[] {
  const sorted = [...lines].filter((l) => l.text.trim()).sort((a, b) => a.y - b.y);
  const rows: OcrLine[][] = [];
  for (const line of sorted) {
    const center = line.y + line.h / 2;
    const row = rows.find((r) => Math.abs(r[0].y + r[0].h / 2 - center) < Math.max(r[0].h, line.h) * 0.6);
    if (row) row.push(line);
    else rows.push([line]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x).map((l) => l.text.trim()).join('  '));
}

/** Importe al final de la fila («2,50», «2.50 €», «12,30 A»). */
function trailingAmount(row: string): { amount: Cents; rest: string } | null {
  const m = row.match(/(-?\d{1,6}(?:[.,]\d{3})*[.,]\d{2})\s*(?:€|eur|[a-z]{1,3}|\*)?\s*$/iu);
  if (!m) return null;
  const amount = parseAmount(m[1]);
  if (!amount || m[1].startsWith('-')) return null;
  return { amount, rest: row.slice(0, m.index).trim() };
}

/**
 * Lee un ticket: comercio (primera línea con nombre), total (la fila «Total»
 * más alta; si no hay, el mayor importe), fecha y productos con su precio.
 */
export function parseReceipt(lines: OcrLine[] | string[], home = 'EUR'): ReceiptData {
  const rows = typeof lines[0] === 'string' ? (lines as string[]) : toRows(lines as OcrLine[]);
  const text = rows.join('\n');

  const merchant =
    rows.find((r) => {
      const letters = (r.match(/\p{L}/gu) ?? []).length;
      const digits = (r.match(/\d/g) ?? []).length;
      return letters >= 3 && digits <= 3 && !SKIP_MERCHANT.test(r);
    }) ?? '';

  // Total
  let total: Cents | null = null;
  let totalRow = -1;
  rows.forEach((r, i) => {
    if (!TOTAL.test(r) || NOT_TOTAL.test(r)) return;
    const a = trailingAmount(r) ?? (rows[i + 1] ? trailingAmount(rows[i + 1]) : null);
    if (a && (total === null || a.amount > total)) {
      total = a.amount;
      totalRow = i;
    }
  });
  if (total === null) {
    const all = rows.map(trailingAmount).filter((x): x is { amount: Cents; rest: string } => !!x);
    if (all.length) total = Math.max(...all.map((x) => x.amount));
  }

  // Fecha: la primera que aparezca (día/mes/año o año-mes-día).
  let date: string | null = null;
  for (const m of text.matchAll(/\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g)) {
    date = parseDate(m[1]);
    if (date) break;
  }

  // Productos: filas con nombre e importe antes del total.
  const items: { name: string; amount: Cents }[] = [];
  const end = totalRow === -1 ? rows.length : totalRow;
  for (const r of rows.slice(0, end)) {
    if (r === merchant || NOT_TOTAL.test(r) || TOTAL.test(r)) continue;
    const a = trailingAmount(r);
    if (!a) continue;
    const name = a.rest.replace(/^\d+\s*[xX×]?\s+/, '').replace(/\s+\d+[.,]\d{2}\s*$/, '').trim();
    if ((name.match(/\p{L}/gu) ?? []).length < 2) continue;
    items.push({ name: name.slice(0, 40), amount: a.amount });
  }

  const currency = findAllMoney(text, home)[0]?.currency ?? home;
  return { merchant: merchant.slice(0, 48), total, currency, date, items };
}
