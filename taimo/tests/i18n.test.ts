import { describe, expect, it } from 'vitest';

import { translate, type Translation } from '../src/i18n/core';
import { LANGUAGES, pickLanguage } from '../src/i18n/languages';
import ca from '../src/i18n/locales/ca';
import cs from '../src/i18n/locales/cs';
import da from '../src/i18n/locales/da';
import de from '../src/i18n/locales/de';
import el from '../src/i18n/locales/el';
import en from '../src/i18n/locales/en';
import es from '../src/i18n/locales/es';
import eu from '../src/i18n/locales/eu';
import fi from '../src/i18n/locales/fi';
import fr from '../src/i18n/locales/fr';
import gl from '../src/i18n/locales/gl';
import it_ from '../src/i18n/locales/it';
import nb from '../src/i18n/locales/nb';
import nl from '../src/i18n/locales/nl';
import pl from '../src/i18n/locales/pl';
import pt from '../src/i18n/locales/pt';
import ro from '../src/i18n/locales/ro';
import sv from '../src/i18n/locales/sv';
import tr from '../src/i18n/locales/tr';
import uk from '../src/i18n/locales/uk';

// Mismo mapa que src/i18n/index.tsx (que no se importa aquí porque usa módulos nativos).
const ALL: Record<string, Translation> = { es, en, fr, de, it: it_, pt, ca, eu, gl, nl, sv, nb, da, fi, pl, cs, ro, el, tr, uk };

function leaves(dict: Translation): [string, string][] {
  const out: [string, string][] = [];
  for (const [section, entries] of Object.entries(dict)) {
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof value === 'string') out.push([`${section}.${key}`, value]);
      else for (const [form, text] of Object.entries(value as Record<string, string>)) out.push([`${section}.${key}.${form}`, text]);
    }
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('traducciones', () => {
  it('hay un diccionario por cada idioma del selector', () => {
    expect(Object.keys(ALL).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  const english = new Map(leaves(en as unknown as Translation));

  for (const [code, dict] of Object.entries(ALL)) {
    it(`${code}: mismas claves y mismos {huecos} que el inglés, sin textos vacíos`, () => {
      const mine = new Map(leaves(dict));
      for (const [key, text] of english) {
        const base = key.replace(/\.(one|other|few|many)$/, '');
        const translated = mine.get(key) ?? (key.endsWith('.other') ? undefined : mine.get(`${base}.other`));
        expect(translated, `${code} ${key}`).toBeTruthy();
        expect(placeholders(translated!), `${code} ${key}`).toEqual(placeholders(text));
      }
    });
  }

  it('interpola y elige plurales según el idioma', () => {
    expect(translate(es, en as unknown as Translation, 'es-ES', 'join.expenses', { count: 1 })).toBe('1 gasto');
    expect(translate(es, en as unknown as Translation, 'es-ES', 'join.expenses', { count: 3 })).toBe('3 gastos');
    expect(translate(pl, en as unknown as Translation, 'pl-PL', 'join.expenses', { count: 3 })).toBe('3 wydatki');
    expect(translate(pl, en as unknown as Translation, 'pl-PL', 'join.expenses', { count: 5 })).toBe('5 wydatków');
    expect(translate(uk, en as unknown as Translation, 'uk-UA', 'join.expenses', { count: 5 })).toBe('5 витрат');
    expect(translate(fi, en as unknown as Translation, 'fi-FI', 'home.hello', { name: 'Aino' })).toBe('Hei, Aino 👋');
  });

  it('elige el idioma del móvil', () => {
    expect(pickLanguage(['fi-FI', 'en-US'])).toBe('fi');
    expect(pickLanguage(['no-NO'])).toBe('nb');
    expect(pickLanguage(['nn-NO'])).toBe('nb');
    expect(pickLanguage(['pt-BR'])).toBe('pt');
    expect(pickLanguage(['ja-JP', 'de-AT'])).toBe('de');
    expect(pickLanguage(['ja-JP'])).toBe('en');
  });
});
