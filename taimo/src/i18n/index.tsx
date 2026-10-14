import { getLocales, useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { WORLD_CURRENCIES } from '@/fx/currencies';
import { useStore } from '@/store/store';

import { translate, type Params, type TKey, type Translation } from './core';
import { isCurrency, LANGUAGES, pickLanguage, type CurrencyCode, type LanguageCode } from './languages';
import ca from './locales/ca';
import cs from './locales/cs';
import da from './locales/da';
import de from './locales/de';
import el from './locales/el';
import en from './locales/en';
import es from './locales/es';
import eu from './locales/eu';
import fi from './locales/fi';
import fr from './locales/fr';
import gl from './locales/gl';
import it from './locales/it';
import nb from './locales/nb';
import nl from './locales/nl';
import pl from './locales/pl';
import pt from './locales/pt';
import ro from './locales/ro';
import sv from './locales/sv';
import tr from './locales/tr';
import uk from './locales/uk';

export const DICTIONARIES: Record<LanguageCode, Translation> = {
  es, en, fr, de, it, pt, ca, eu, gl, nl, sv, nb, da, fi, pl, cs, ro, el, tr, uk,
};

export { LANGUAGES, CURRENCIES } from './languages';
export type { LanguageCode, CurrencyCode } from './languages';
export type { TKey } from './core';

/** Idioma del móvil (el primero que tengamos traducido). */
export function deviceLanguage(): LanguageCode {
  try {
    return pickLanguage(getLocales().map((l) => l.languageTag));
  } catch {
    return 'en';
  }
}

/** Moneda que usa el móvil, si es una de las que ofrecemos; si no, euro. */
export function deviceCurrency(): CurrencyCode {
  try {
    const code = getLocales()[0]?.currencyCode;
    return isCurrency(code) ? code : 'EUR';
  } catch {
    return 'EUR';
  }
}

export interface I18n {
  lang: LanguageCode;
  /** Locale BCP-47 para fechas y números ("fi-FI"). */
  locale: string;
  currency: CurrencyCode;
  t: (key: TKey, params?: Params) => string;
  /** 1250 -> "12,50 €" / "€12.50" / "12,50 kr"… según idioma y moneda. */
  money: (cents: number) => string;
  /** Sin decimales, para gráficos. */
  moneyShort: (cents: number) => string;
  /** Importe en otra moneda (viajes): 300000 JPY -> "¥3,000". */
  moneyIn: (cents: number, currency: string) => string;
  /** Nombre de la moneda en el idioma del usuario ("yen japonés"). */
  currencyName: (code: string) => string;
  /** Número con decimales en el formato del idioma (tipos de cambio). */
  number: (n: number, digits?: number) => string;
  date: (d: Date | string, opts: Intl.DateTimeFormatOptions) => string;
}

export function makeI18n(lang: LanguageCode, currency: CurrencyCode): I18n {
  const locale = LANGUAGES.find((l) => l.code === lang)?.locale ?? 'en-GB';
  const dict = DICTIONARIES[lang];
  const full = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const short = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  // Monedas sin decimales (yen, peso chileno): los céntimos internos siguen siendo /100.
  const formatters = new Map<string, Intl.NumberFormat>();
  const fmt = (c: string) => {
    if (!formatters.has(c)) formatters.set(c, new Intl.NumberFormat(locale, { style: 'currency', currency: c }));
    return formatters.get(c)!;
  };
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    names = null; // motores sin DisplayNames: usamos el nombre en inglés
  }
  const english = new Map(WORLD_CURRENCIES.map(([code, name]) => [code, name]));
  return {
    lang,
    locale,
    currency,
    t: (key, params) => translate(dict, en, locale, key, params),
    money: (cents) => full.format(cents / 100),
    moneyShort: (cents) => short.format(Math.round(cents / 100)),
    moneyIn: (cents, c) => fmt(c).format(cents / 100),
    currencyName: (code) => {
      try {
        const n = names?.of(code);
        if (n && n !== code) return n.charAt(0).toUpperCase() + n.slice(1);
      } catch {
        // código raro: caemos al inglés
      }
      return english.get(code) ?? code;
    },
    number: (n, digits = 4) => new Intl.NumberFormat(locale, { maximumSignificantDigits: digits }).format(n),
    date: (d, opts) => {
      const value = typeof d === 'string' ? new Date(d) : d;
      // Fecha mal escrita o corrupta: mejor nada que romper la pantalla.
      if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
      return new Intl.DateTimeFormat(locale, opts).format(value);
    },
  };
}

/** Textos, moneda y formatos según lo que el usuario eligió (o el idioma del móvil). */
export function useI18n(): I18n {
  const { state } = useStore();
  const locales = useLocales();
  const pref = state.profile.language ?? 'auto';
  const lang: LanguageCode = pref === 'auto' ? pickLanguage(locales.map((l) => l.languageTag)) : pref;
  const currency: CurrencyCode = isCurrency(state.profile.currency) ? state.profile.currency : 'EUR';
  return useMemo(() => makeI18n(lang, currency), [lang, currency]);
}
