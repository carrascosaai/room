import type { CategoryId } from './types';

/** "  MERCADONA, S.A.  " -> "mercadona s a" */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Palabras clave de comercios habituales en España. El orden importa: gana la
// primera regla que coincide (p. ej. "amazon prime" antes que "amazon").
const RULES: [CategoryId, string[]][] = [
  ['suscripciones', ['netflix', 'spotify', 'hbo', 'max com', 'disney', 'amazon prime', 'prime video', 'apple com bill', 'icloud', 'youtube premium', 'dazn', 'movistar plus', 'filmin', 'chatgpt', 'openai']],
  ['super', ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia ', 'supermercado', 'eroski', 'alcampo', 'hipercor', 'consum', 'bonpreu', 'condis', 'caprabo', 'ahorramas', 'gadis', 'froiz', 'masymas', 'spar', 'hiper', 'coviran', 'bm supermercados', 'simply']],
  ['comer', ['mcdonald', 'burger king', 'telepizza', 'domino', 'kfc', 'glovo', 'just eat', 'uber eats', 'restaurante', 'restaurant', 'bar ', 'cafe', 'cafeteria', 'starbucks', 'taberna', 'pizzeria', 'kebab', 'sushi', 'foster', 'goiko', 'vips', '100 montaditos', 'tgb', 'five guys', 'rodilla', 'panaderia', 'pasteleria']],
  ['transporte', ['renfe', 'metro', 'emt', 'tmb', 'cabify', 'uber', 'bolt', 'freenow', 'free now', 'repsol', 'cepsa', 'moeve', 'galp', 'shell', 'bp ', 'gasolinera', 'parking', 'aparcamiento', 'ouigo', 'iryo', 'alsa', 'vueling', 'ryanair', 'iberia', 'blablacar', 'bicing', 'autopista']],
  ['deporte', ['decathlon', 'gimnasio', 'gym', 'basic fit', 'altafit', 'mcfit', 'anytime fitness', 'synergym', 'go fit', 'padel', 'playtomic', 'sprinter', 'forum sport', 'nike', 'adidas']],
  ['ocio', ['cine', 'cinesa', 'yelmo', 'kinepolis', 'ticketmaster', 'entradas', 'eventbrite', 'fever', 'steam', 'playstation', 'nintendo', 'xbox', 'teatro', 'museo', 'concierto', 'discoteca', 'bowling', 'real madrid', 'fc barcelona', 'atletico', 'laliga', 'estadio']],
  ['estudios', ['libreria', 'casa del libro', 'udemy', 'coursera', 'domestika', 'universidad', 'academia', 'matricula', 'fnac', 'papeleria', 'copisteria']],
  ['salud', ['farmacia', 'clinica', 'dentista', 'hospital', 'optica', 'fisioterapia', 'sanitas', 'adeslas', 'dkv']],
  ['casa', ['ikea', 'leroy merlin', 'bricomart', 'iberdrola', 'endesa', 'naturgy', 'holaluz', 'movistar', 'vodafone', 'orange', 'digi', 'masmovil', 'lowi', 'simyo', 'pepephone', 'canal de isabel', 'aguas', 'alquiler', 'comunidad']],
  ['compras', ['zara', 'primark', 'pull bear', 'bershka', 'stradivarius', 'mango', 'h m', 'el corte ingles', 'amazon', 'aliexpress', 'shein', 'mediamarkt', 'pccomponentes', 'apple store', 'sephora', 'druni', 'primor']],
];

/**
 * Devuelve la categoría más probable para un comercio. Primero mira lo que el
 * usuario ya corrigió antes (`learned`), después las reglas por palabra clave.
 */
export function categorize(
  merchant: string,
  learned: Record<string, CategoryId> = {},
): CategoryId {
  const key = normalizeMerchant(merchant);
  if (!key) return 'otros';
  if (learned[key]) return learned[key];
  // Espacios alrededor para que palabras cortas ("bar ", "dia ") no coincidan
  // dentro de otras ("barcelona", "diario").
  const padded = ` ${key} `;
  for (const [cat, keywords] of RULES) {
    if (keywords.some((k) => padded.includes(` ${k.trim()} `) || (k.trim().length > 4 && key.includes(k.trim())))) {
      return cat;
    }
  }
  return 'otros';
}
