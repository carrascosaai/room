/**
 * «Antes de pagar, comprueba»: ayudas sencillas para frenar las estafas más
 * comunes en España (el «hijo en apuros» por WhatsApp, el SMS falso del banco,
 * la tasa de un paquete que no esperabas, las inversiones milagro…).
 * Nada sale del móvil: solo se buscan palabras en el texto que pegas.
 */

/** Señales de alarma que se pueden encontrar en un mensaje. */
export type ScamSign = 'newNumber' | 'family' | 'urgent' | 'code' | 'money' | 'bank' | 'link' | 'delivery' | 'prize' | 'investment';

/** Orden en el que se enseñan (de más a menos peligrosa). */
export const SCAM_SIGNS: ScamSign[] = ['newNumber', 'code', 'family', 'urgent', 'money', 'bank', 'link', 'delivery', 'prize', 'investment'];

/** Minúsculas y sin tildes, para que «Código», «codigo» y «CÓDIGO» sean lo mismo. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Patrones sobre el texto ya normalizado (sin tildes). Español primero; algo de inglés y catalán.
const PATTERNS: Record<ScamSign, RegExp[]> = {
  newNumber: [
    /\b(nuevo|otro) (numero|movil|telefono)\b/,
    /\b(numero|movil|telefono) nuevo\b/,
    /\bcambiado de (numero|movil|telefono)\b/,
    /\b(se me ha|se me) (roto|caido|perdido|mojado)\b/,
    /\b(movil|telefono) (roto|estropeado)\b/,
    /\bguarda (este|mi) numero\b/,
    /\bnew (number|phone)\b/,
    /\bnou (numero|mobil)\b/,
  ],
  family: [
    /\b(hijo|hija|mama|mami|papa|papi|abuelo|abuela|abu|nieto|nieta|sobrino|sobrina)\b/,
    /\bsoy (yo|tu hijo|tu hija)\b/,
    /\b(mum|mom|dad|daughter|grandma|grandpa)\b/,
    /\b(fill|filla|avia)\b/,
  ],
  urgent: [
    /\burgen(te|cia)\b/,
    /\b(ahora mismo|ya mismo|cuanto antes|lo antes posible|hoy mismo|inmediatamente|enseguida|rapido)\b/,
    /\b(en|antes de) (las )?(24|48) ?h(oras)?\b/,
    /\b(bloquead[ao]|suspendid[ao]|cancelad[ao]) /,
    /\b(urgent|asap|immediately|right now)\b/,
  ],
  code: [
    /\bcodigo/,
    /\b(clave|claves|contrasena|pin|cvv|cvc)\b/,
    /\b(sms de|numero de) (verificacion|confirmacion|seguridad)\b/,
    /\b(code|otp|password|passcode)\b/,
    /\b(codi|contrasenya)\b/,
  ],
  money: [
    /\bbizum/,
    /\btransferencia/,
    /\btransfier[ea]/,
    /\b(hazme|haz|enviame|mandame|pasame|prestame|dejame) (un |el |dinero|pasta|\d)/,
    /\b(ingreso|ingresa|ingresar|ingresame)\b/,
    /\b(pagar|paga|pago) (ya|hoy|ahora|la factura|una tasa)\b/,
    /\b(send|transfer|wire) (me )?(money|\d)/,
  ],
  bank: [
    /\b(tu|su) (banco|cuenta|tarjeta)\b/,
    /\bmovimiento (sospechoso|inusual|no autorizado)\b/,
    /\bacceso (no autorizado|inusual|sospechoso)\b/,
    /\b(verifica|verificar|confirma|confirmar|actualiza|actualizar) (tus|sus) datos\b/,
    /\b(your|unusual) (bank|account|card)\b/,
  ],
  link: [/https?:\/\//, /\bwww\./, /\b[a-z0-9-]+\.(com|es|net|org|info|top|xyz|link|ly|me|app|co|io|cc|site|online|shop)(\/|\b)/],
  delivery: [
    /\b(paquete|envio|entrega|pedido|aduana|aduanas|repartidor)\b/,
    /\b(correos|dhl|seur|mrw|gls|ups|fedex|nacex|amazon)\b/,
    /\b(tasa|gastos) de (envio|aduana|entrega)\b/,
    /\b(parcel|delivery|package|customs)\b/,
  ],
  prize: [/\b(premio|has ganado|ganador|ganadora|sorteo|regalo|gratis|enhorabuena|felicidades)\b/, /\b(prize|winner|you won|free gift)\b/],
  investment: [
    /\b(inversion|invertir|invierte|inversiones|rentabilidad|bitcoin|cripto|criptomoneda|criptomonedas|trading|forex)\b/,
    /\b(ganar|gana) dinero\b/,
    /\b(beneficios?|ganancias?) (garantizad[oa]s?|segur[oa]s?)\b/,
    /\b(dobla|duplica|multiplica) (tu|tus|su|sus) (dinero|ahorros)\b/,
    /\b(invest|investment|crypto|guaranteed)\b/,
  ],
};

/** Señales de alarma que aparecen en un mensaje (en orden fijo, sin repetir). */
export function scamSigns(text: string): ScamSign[] {
  const t = normalize(text ?? '');
  if (!t.trim()) return [];
  return SCAM_SIGNS.filter((sign) => PATTERNS[sign].some((re) => re.test(t)));
}

/**
 * Cuánto preocupa un mensaje: «high» si pide un código, viene de un número
 * nuevo o junta dos señales o más; «some» con una sola; «none» sin ninguna.
 */
export function scamRisk(signs: ScamSign[]): 'none' | 'some' | 'high' {
  if (signs.length === 0) return 'none';
  if (signs.length >= 2 || signs.includes('code') || signs.includes('newNumber')) return 'high';
  return 'some';
}

/**
 * Resultado de la lista de preguntas: con un solo «sí» hay que parar;
 * con todo «no», parece normal; si faltan respuestas, aún no se sabe.
 */
export function checklistResult(answers: (boolean | undefined)[], total: number): 'stop' | 'ok' | 'pending' {
  if (answers.some((a) => a === true)) return 'stop';
  const answered = answers.filter((a) => a === false).length;
  return answered >= total ? 'ok' : 'pending';
}

/** Enlace para llamar («tel:+34600111222»). Sin al menos 3 cifras, no hay enlace. */
export function telHref(phone: string): string | null {
  const clean = (phone ?? '').trim().replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return clean.replace(/\D/g, '').length >= 3 ? `tel:${clean}` : null;
}

/** Persona de confianza lista para guardar, o null si falta el nombre o el teléfono. */
export function cleanTrusted(name: string, phone: string): { name: string; phone: string } | null {
  const n = (name ?? '').trim().replace(/\s+/g, ' ');
  const p = (phone ?? '').trim();
  return n && telHref(p) ? { name: n, phone: p } : null;
}
