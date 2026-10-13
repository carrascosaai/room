/** Idiomas disponibles, con su nombre en su propio idioma. */
export const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'en', name: 'English', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', locale: 'pt-PT' },
  { code: 'ca', name: 'Català', flag: '', locale: 'ca-ES' },
  { code: 'eu', name: 'Euskara', flag: '', locale: 'eu-ES' },
  { code: 'gl', name: 'Galego', flag: '', locale: 'gl-ES' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', locale: 'nl-NL' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪', locale: 'sv-SE' },
  { code: 'nb', name: 'Norsk', flag: '🇳🇴', locale: 'nb-NO' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰', locale: 'da-DK' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮', locale: 'fi-FI' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿', locale: 'cs-CZ' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', locale: 'ro-RO' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷', locale: 'el-GR' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', locale: 'uk-UA' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function isLanguageCode(v: unknown): v is LanguageCode {
  return LANGUAGES.some((l) => l.code === v);
}

// Variantes del sistema que mapean a uno de nuestros idiomas (no = noruego bokmål, nn = nynorsk).
const ALIASES: Record<string, LanguageCode> = { no: 'nb', nn: 'nb', va: 'ca' };

/** Elige el idioma a partir de los idiomas preferidos del móvil ("fi-FI", "pt-BR"…). */
export function pickLanguage(preferred: string[]): LanguageCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    const code = ALIASES[base] ?? base;
    if (isLanguageCode(code)) return code;
  }
  return 'en';
}

import { isWorldCurrency } from '../fx/fx';

/** Monedas más usadas (accesos rápidos). Se puede elegir cualquiera de las 155 del mundo. */
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'RON', 'TRY', 'UAH', 'MXN', 'BRL', 'ARS', 'COP', 'CLP', 'CAD', 'AUD', 'JPY'] as const;
/** Código ISO 4217 de cualquier moneda del mundo. */
export type CurrencyCode = string;

export function isCurrency(v: unknown): v is CurrencyCode {
  return isWorldCurrency(v);
}
