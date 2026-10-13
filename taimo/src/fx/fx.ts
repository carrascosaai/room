import type { Cents } from '@/domain/types';

import { WORLD_CURRENCIES } from './currencies';
import { FALLBACK_DATE, FALLBACK_RATES } from './fallbackRates';

/** Tipos de cambio con base euro: 1 EUR = rates[X] unidades de X. */
export interface Rates {
  date: string;
  /** Cuándo se descargaron (ISO) para saber si hay que refrescar. */
  fetchedAt: string;
  rates: Record<string, number>;
  source: 'online' | 'fallback';
}

export const FALLBACK: Rates = { date: FALLBACK_DATE, fetchedAt: '1970-01-01T00:00:00.000Z', rates: FALLBACK_RATES, source: 'fallback' };

const CODES = new Set(WORLD_CURRENCIES.map((c) => c[0]));

export function isWorldCurrency(code: unknown): code is string {
  return typeof code === 'string' && CODES.has(code);
}

/** Cuántas unidades de `to` vale 1 unidad de `from`. */
export function rateBetween(from: string, to: string, rates: Rates = FALLBACK): number | null {
  if (from === to) return 1;
  const f = from === 'EUR' ? 1 : rates.rates[from];
  const t = to === 'EUR' ? 1 : rates.rates[to];
  if (!f || !t) return null;
  return t / f;
}

/** Convierte un importe (en centésimas de la moneda origen) a la moneda destino. */
export function convert(amount: Cents, from: string, to: string, rates: Rates = FALLBACK): Cents | null {
  const r = rateBetween(from, to, rates);
  return r === null ? null : Math.round(amount * r);
}

/** Si conviene volver a descargar (más de 12 horas o solo tenemos los de respaldo). */
export function isStale(rates: Rates | undefined, now = new Date()): boolean {
  if (!rates || rates.source === 'fallback') return true;
  return now.getTime() - new Date(rates.fetchedAt).getTime() > 12 * 3600_000;
}

type Fetch = typeof fetch;

/** Lee las respuestas de las distintas fuentes y las pasa a nuestro formato (base EUR, códigos en mayúsculas). */
export function parseRatesResponse(json: unknown, now = new Date()): Rates | null {
  const j = json as Record<string, unknown>;
  // @fawazahmed0/currency-api: { date, eur: { usd: 1.1, ... } }
  if (j && typeof j.date === 'string' && j.eur && typeof j.eur === 'object') {
    const rates: Record<string, number> = {};
    for (const [k, v] of Object.entries(j.eur as Record<string, number>)) {
      const code = k.toUpperCase();
      if (CODES.has(code) && typeof v === 'number' && v > 0) rates[code] = v;
    }
    return Object.keys(rates).length > 20 ? { date: j.date, fetchedAt: now.toISOString(), rates, source: 'online' } : null;
  }
  // open.er-api.com: { result: 'success', base_code: 'EUR', time_last_update_utc, rates: { USD: 1.1 } }
  if (j && j.result === 'success' && j.base_code === 'EUR' && j.rates && typeof j.rates === 'object') {
    const rates: Record<string, number> = {};
    for (const [k, v] of Object.entries(j.rates as Record<string, number>)) if (CODES.has(k) && v > 0) rates[k] = v;
    const date = new Date(String(j.time_last_update_utc ?? now.toISOString())).toISOString().slice(0, 10);
    return Object.keys(rates).length > 20 ? { date, fetchedAt: now.toISOString(), rates, source: 'online' } : null;
  }
  return null;
}

const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json',
  'https://latest.currency-api.pages.dev/v1/currencies/eur.min.json',
  'https://open.er-api.com/v6/latest/EUR',
];

/** Descarga los tipos del día probando varias fuentes gratuitas. Devuelve null si no hay conexión. */
export async function fetchRates(fetcher: Fetch = fetch, now = new Date()): Promise<Rates | null> {
  for (const url of SOURCES) {
    try {
      const res = await fetcher(url);
      if (!res.ok) continue;
      const parsed = parseRatesResponse(await res.json(), now);
      if (parsed) return parsed;
    } catch {
      // probamos la siguiente fuente
    }
  }
  return null;
}
