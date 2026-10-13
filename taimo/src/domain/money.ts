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
