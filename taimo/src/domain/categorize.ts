import type { CategoryId } from './types';

/** "  MERCADONA, S.A.  " -> "mercadona s a" */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Palabras clave de comercios habituales en España y en el mundo, y palabras
// genéricas («cena», «dinner», «Miete»…) en varios idiomas. El orden importa: gana la
// primera regla que coincide (p. ej. "amazon prime" antes que "amazon").
const RULES: [CategoryId, string[]][] = [
  ['suscripciones', ['netflix', 'spotify', 'hbo', 'max com', 'disney', 'amazon prime', 'prime video', 'apple com bill', 'icloud', 'youtube premium', 'dazn', 'movistar plus', 'filmin', 'chatgpt', 'openai', 'subscription', 'suscripcion', 'abonnement', 'apple music', 'game pass', 'playstation plus', 'ps plus', 'microsoft 365', 'office 365', 'adobe', 'dropbox', 'google one', 'crunchyroll', 'paramount', 'peacock', 'hulu', 'audible', 'kindle unlimited', 'patreon', 'twitch', 'deezer', 'tidal', 'canva', 'notion']],
  ['super', ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia ', 'supermercado', 'eroski', 'alcampo', 'hipercor', 'consum', 'bonpreu', 'condis', 'caprabo', 'ahorramas', 'gadis', 'froiz', 'masymas', 'spar', 'hiper', 'coviran', 'bm supermercados', 'simply', 'supermarket', 'grocery', 'groceries', 'supermarche', 'supermarkt', 'supermercato', 'alimentacion', 'fruteria', 'carniceria', 'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'walmart', 'costco', 'kroger', 'whole foods', 'trader joe', 'safeway', 'publix', 'rewe', 'edeka', 'penny', 'netto', 'kaufland', 'auchan', 'leclerc', 'intermarche', 'monoprix', 'franprix', 'esselunga', 'conad', 'pingo doce', 'continente', 'albert heijn', 'jumbo', 'ica', 'rema', 'k market', 's market', 'prisma', 'biedronka', 'zabka', 'lewiatan', 'billa', 'migros', 'denner', '7 eleven', 'seven eleven', 'family mart', 'familymart', 'lawson', 'oxxo', 'soriana', 'chedraui', 'pao de acucar', 'dmart', 'big bazaar', 'tesco lotus', 'пятерочка', 'магнит', 'перекресток', 'сильпо', 'атб', 'novus', 'セブンイレブン', 'ファミリーマート', 'ローソン']],
  ['comer', ['mcdonald', 'burger king', 'telepizza', 'domino', 'kfc', 'glovo', 'just eat', 'uber eats', 'restaurante', 'restaurant', 'bar ', 'cafe', 'cafeteria', 'starbucks', 'taberna', 'pizzeria', 'kebab', 'sushi', 'foster', 'goiko', 'vips', '100 montaditos', 'tgb', 'five guys', 'rodilla', 'panaderia', 'pasteleria', 'cena', 'comida', 'almuerzo', 'desayuno', 'merienda', 'tapas', 'menu', 'dinner', 'lunch', 'breakfast', 'brunch', 'coffee', 'kaffee', 'caffe', 'diner', 'bistro', 'brasserie', 'trattoria', 'osteria', 'ristorante', 'pizza', 'burger', 'ramen', 'noodle', 'deliveroo', 'doordash', 'grubhub', 'wolt', 'foodpanda', 'swiggy', 'zomato', 'rappi', 'ifood', 'lieferando', 'thuisbezorgd', 'chipotle', 'subway', 'taco bell', 'wendy', 'pret', 'costa coffee', 'tim hortons', 'dunkin', 'ichiran', 'yoshinoya', 'matsuya', 'sukiya', 'restoran', 'ресторан', 'кафе', 'кофе', 'ラーメン', 'カフェ', '레스토랑', '카페']],
  ['transporte', ['transport', 'renfe', 'metro', 'emt', 'tmb', 'cabify', 'uber', 'bolt', 'freenow', 'free now', 'repsol', 'cepsa', 'moeve', 'galp', 'shell', 'bp ', 'gasolinera', 'parking', 'aparcamiento', 'ouigo', 'iryo', 'alsa', 'vueling', 'ryanair', 'iberia', 'blablacar', 'bicing', 'autopista', 'taxi', 'bus', 'train', 'tren', 'gasolina', 'gas station', 'fuel', 'petrol', 'tankstelle', 'essence', 'carburant', 'benzina', 'combustivel', 'lyft', 'grab', 'didi', 'ola cabs', 'sncf', 'deutsche bahn', 'db bahn', 'trenitalia', 'italo', 'flixbus', 'suica', 'pasmo', 'oyster', 'tfl', 'mta', 'peaje', 'toll', 'easyjet', 'lufthansa', 'air france', 'klm', 'wizz', 'emirates', 'такси', 'метро']],
  ['deporte', ['decathlon', 'gimnasio', 'gym', 'basic fit', 'altafit', 'mcfit', 'anytime fitness', 'synergym', 'go fit', 'padel', 'playtomic', 'sprinter', 'forum sport', 'nike', 'adidas', 'fitness', 'yoga', 'pilates', 'crossfit', 'sport', 'gimnas']],
  ['ocio', ['cine', 'cinesa', 'yelmo', 'kinepolis', 'ticketmaster', 'entradas', 'eventbrite', 'fever', 'steam', 'playstation', 'nintendo', 'xbox', 'teatro', 'museo', 'concierto', 'discoteca', 'bowling', 'real madrid', 'fc barcelona', 'atletico', 'laliga', 'estadio', 'cinema', 'movie', 'kino', 'concert', 'tickets', 'museum', 'theater', 'theatre', 'escape room', 'karaoke', 'кино']],
  ['estudios', ['libreria', 'casa del libro', 'udemy', 'coursera', 'domestika', 'universidad', 'academia', 'matricula', 'fnac', 'papeleria', 'copisteria', 'course', 'curso', 'school', 'escuela', 'colegio', 'university', 'books', 'libros', 'book', 'duolingo', 'babbel']],
  ['salud', ['farmacia', 'clinica', 'dentista', 'hospital', 'optica', 'fisioterapia', 'sanitas', 'adeslas', 'dkv', 'pharmacy', 'apotheke', 'pharmacie', 'apotek', 'apteka', 'lekarna', 'doctor', 'medico', 'dentist', 'clinic', 'cvs', 'walgreens', 'boots', 'аптека', '薬局']],
  ['casa', ['ikea', 'leroy merlin', 'bricomart', 'iberdrola', 'endesa', 'naturgy', 'holaluz', 'movistar', 'vodafone', 'orange', 'digi', 'masmovil', 'lowi', 'simyo', 'pepephone', 'canal de isabel', 'aguas', 'alquiler', 'comunidad', 'rent', 'renta', 'miete', 'loyer', 'affitto', 'aluguel', 'huur', 'hyra', 'electricity', 'luz', 'agua', 'water', 'internet', 'wifi', 'home depot', 'lowes', 'b q', 'obi', 'bauhaus', 'hornbach', 'castorama', 'brico', 'аренда']],
  ['compras', ['zara', 'primark', 'pull bear', 'bershka', 'stradivarius', 'mango', 'h m', 'el corte ingles', 'amazon', 'aliexpress', 'shein', 'mediamarkt', 'pccomponentes', 'apple store', 'sephora', 'druni', 'primor', 'shop', 'store', 'tienda', 'mall', 'uniqlo', 'target', 'best buy', 'ebay', 'etsy', 'zalando', 'otto', 'temu', 'h&m', 'muji', 'daiso', 'don quijote', 'ozon', 'wildberries', 'rakuten', 'mercadolibre', 'mercado libre', 'flipkart', 'myntra']],
];

// Las palabras clave pasan por la misma normalización que el comercio (tildes, katakana…).
let normalized: [CategoryId, string[]][] | null = null;
const normalizedRules = () => (normalized ??= RULES.map(([cat, words]) => [cat, words.map(normalizeMerchant).filter(Boolean)]));

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
  for (const [cat, keywords] of normalizedRules()) {
    if (keywords.some((k) => padded.includes(` ${k} `) || (k.length > 4 && key.includes(k)))) {
      return cat;
    }
  }
  return 'otros';
}
