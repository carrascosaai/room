import type { Cents } from './types';

/**
 * Convierte un importe escrito por una persona o enviado por un Atajo de Apple
 * ("12,50 €", "€12.50", "1.234,56", "-8,90 EUR", "12") a céntimos positivos.
 * Devuelve null si no hay un número reconocible.
 */
export function parseAmount(input: string | number | null | undefined): Cents | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(Math.abs(input) * 100) : null;
  }
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = cleaned;
  } else {
    // El separador que aparece el último es el decimal, salvo que lleve
    // exactamente 3 dígitos detrás y sea el único separador (p. ej. "1.234").
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const decimalIdx = Math.max(lastComma, lastDot);
    const digitsAfter = cleaned.length - decimalIdx - 1;
    const onlyOneSep = !(lastComma !== -1 && lastDot !== -1) && cleaned.split(decimalSep).length === 2;
    if (onlyOneSep && digitsAfter === 3) {
      normalized = cleaned.replace(/[.,]/g, '');
    } else {
      const intPart = cleaned.slice(0, decimalIdx).replace(/[.,]/g, '');
      normalized = `${intPart}.${cleaned.slice(decimalIdx + 1)}`;
    }
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

const formatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** 1250 -> "12,50 €" */
export function formatMoney(cents: Cents): string {
  return formatter.format(cents / 100);
}

/** 125000 -> "1250 €" (sin decimales, para gráficos y títulos). */
export function formatMoneyShort(cents: Cents): string {
  return compactFormatter.format(Math.round(cents / 100));
}

const decimalsCache = new Map<string, number>();

/** Decimales que usa una moneda: 2 para EUR/USD, 0 para JPY/CLP… (2 si no se sabe). */
export function currencyDecimals(code: string): number {
  if (decimalsCache.has(code)) return decimalsCache.get(code)!;
  let digits = 2;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  decimalsCache.set(code, digits);
  return digits;
}

/** Importe sin símbolo con los decimales de su moneda: 1250 EUR -> "12.50"; 300000 JPY -> "3000". */
export function plainAmount(cents: Cents, code: string): string {
  return (cents / 100).toFixed(currencyDecimals(code));
}

/**
 * Fecha de viaje escrita a mano: acepta "2026-11-15" y "15/11/2026" (también con - o .).
 * Devuelve "YYYY-MM-DD", '' si está vacía, o null si no es una fecha válida.
 */
export function parseTripDate(input: string): string | null {
  const s = input.trim();
  if (!s) return '';
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
