import { getLocales, useLocales } from 'expo-localization';
import { useMemo } from 'react';

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
  date: (d: Date | string, opts: Intl.DateTimeFormatOptions) => string;
}

export function makeI18n(lang: LanguageCode, currency: CurrencyCode): I18n {
  const locale = LANGUAGES.find((l) => l.code === lang)?.locale ?? 'en-GB';
  const dict = DICTIONARIES[lang];
  const full = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const short = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  // Monedas sin decimales (yen, peso chileno): los céntimos internos siguen siendo /100.
  return {
    lang,
    locale,
    currency,
    t: (key, params) => translate(dict, en, locale, key, params),
    money: (cents) => full.format(cents / 100),
    moneyShort: (cents) => short.format(Math.round(cents / 100)),
    date: (d, opts) => new Intl.DateTimeFormat(locale, opts).format(typeof d === 'string' ? new Date(d) : d),
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
