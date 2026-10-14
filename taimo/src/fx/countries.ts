import { WORLD_CURRENCIES } from './currencies';

/**
 * Países que usan cada moneda, para buscar «Japón» o «Alemania» en el selector.
 * El país principal sale de la bandera de la moneda (🇯🇵 → JP); aquí solo van
 * las monedas que comparten varios países (euro, dólar, francos CFA…).
 */
const EXTRA: Record<string, string[]> = {
  EUR: ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK'],
  USD: ['US', 'EC', 'SV', 'PA', 'PR', 'TL', 'ZW', 'FM', 'MH', 'PW'],
  XOF: ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'],
  XAF: ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA'],
  XCD: ['AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'AI', 'MS'],
  XPF: ['PF', 'NC', 'WF'],
  AUD: ['AU', 'KI', 'NR', 'TV'],
  NZD: ['NZ', 'CK', 'NU'],
  CHF: ['CH', 'LI'],
  DKK: ['DK', 'GL', 'FO'],
  NOK: ['NO', 'SJ'],
  INR: ['IN', 'BT'],
  ZAR: ['ZA', 'LS', 'NA'],
  GBP: ['GB', 'IM', 'JE', 'GG'],
};

/** 🇯🇵 → 'JP' (las banderas son dos «letras regionales»). */
export function flagRegion(flag: string): string | null {
  const cps = [...flag].map((c) => c.codePointAt(0) ?? 0);
  if (cps.length !== 2 || cps.some((c) => c < 0x1f1e6 || c > 0x1f1ff)) return null;
  return String.fromCharCode(...cps.map((c) => c - 0x1f1e6 + 65));
}

/** Códigos de país (ISO 3166) que usan una moneda. */
export function currencyRegions(code: string): string[] {
  const flag = WORLD_CURRENCIES.find(([c]) => c === code)?.[2] ?? '';
  const main = flagRegion(flag);
  const list = [...(EXTRA[code] ?? []), ...(main && main !== 'EU' ? [main] : [])];
  return [...new Set(list)];
}

/**
 * Nombres de los países de cada moneda en tu idioma y en inglés, para el
 * buscador. Sin Intl.DisplayNames (motores viejos) se busca solo por código.
 */
export function countryIndex(locale: string): Map<string, string> {
  let local: Intl.DisplayNames | null = null;
  let english: Intl.DisplayNames | null = null;
  try {
    local = new Intl.DisplayNames([locale], { type: 'region' });
    english = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    // sin nombres de países
  }
  const name = (dn: Intl.DisplayNames | null, r: string) => {
    try {
      return dn?.of(r) ?? '';
    } catch {
      return '';
    }
  };
  const out = new Map<string, string>();
  for (const [code] of WORLD_CURRENCIES) {
    const regions = currencyRegions(code);
    out.set(code, regions.map((r) => `${name(local, r)} ${name(english, r)}`).join(' '));
  }
  return out;
}

/** Igual que en el buscador: sin mayúsculas ni tildes. */
export const normSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Monedas que encajan con lo que se busca: código, nombre de la moneda o país. */
export function searchCurrencies(query: string, names: (code: string) => string, countries: Map<string, string>): string[] {
  const q = normSearch(query.trim());
  if (!q) return [];
  return WORLD_CURRENCIES.filter(
    ([code, name]) =>
      normSearch(code).includes(q) || normSearch(name).includes(q) || normSearch(names(code)).includes(q) || normSearch(countries.get(code) ?? '').includes(q),
  ).map(([code]) => code);
}
