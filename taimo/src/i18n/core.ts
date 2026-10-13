import en from './locales/en';

/** Diccionario base: el inglés define todas las claves; el resto de idiomas debe tener las mismas. */
export type Dict = typeof en;

/** Plural: `one` y `other` siempre; `few`/`many` para idiomas que los usan (polaco, checo, ucraniano…). */
type Plural = { one: string; other: string; few?: string; many?: string };
type Leaf = string | Plural;

/** "home.title", "cat.super"… todas las rutas hasta un texto. */
export type TKey = {
  [K in keyof Dict]: Dict[K] extends Leaf
    ? K & string
    : { [K2 in keyof Dict[K]]: Dict[K][K2] extends Leaf ? `${K & string}.${K2 & string}` : never }[keyof Dict[K]];
}[keyof Dict];

/** Mismo formato que el inglés pero con textos libres (para que TypeScript no exija el texto literal). */
export type Translation = {
  [K in keyof Dict]: { [K2 in keyof Dict[K]]: Dict[K][K2] extends string ? string : Plural };
};

export type Params = Record<string, string | number>;

function lookup(dict: Translation, key: string): Leaf | undefined {
  const [section, name] = key.split('.');
  const s = (dict as unknown as Record<string, Record<string, Leaf>>)[section];
  return s?.[name];
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/**
 * Traduce una clave. Si el idioma no la tiene, usa el inglés. Los plurales
 * ({ one, other }) se eligen con `count` según las reglas del idioma.
 */
export function translate(dict: Translation, fallback: Translation, locale: string, key: TKey, params?: Params): string {
  const value = lookup(dict, key) ?? lookup(fallback, key);
  if (value === undefined) return key;
  if (typeof value === 'string') return interpolate(value, params);
  const count = Number(params?.count ?? 0);
  const rule = new Intl.PluralRules(locale).select(count) as 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  const text = rule === 'one' ? value.one : rule === 'few' || rule === 'many' ? (value[rule] ?? value.other) : value.other;
  return interpolate(text, params);
}
