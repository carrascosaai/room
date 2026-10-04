/**
 * Filtro de contenido previo a publicar (cliente y servidor).
 * La base de datos aplica además sus propias comprobaciones (ver migración).
 * No sustituye a la moderación humana: es la primera barrera.
 */
import type { ReportReason } from "./types";

export const REPORT_REASONS: { id: ReportReason; label: string; hint: string }[] = [
  { id: "spam", label: "Spam", hint: "Publicidad, enlaces o mensajes repetidos" },
  { id: "acoso", label: "Acoso", hint: "Insultos, amenazas o burlas hacia alguien" },
  { id: "sexual", label: "Contenido sexual", hint: "Contenido sexual explícito" },
  { id: "datos_personales", label: "Información personal", hint: "Nombres completos, teléfonos, direcciones…" },
  { id: "fraude", label: "Fraude", hint: "Estafas, entradas falsas, suplantación" },
  { id: "otro", label: "Otro", hint: "Cualquier otra cosa que no debería estar aquí" },
];

export const COMMUNITY_RULES = [
  "Nada de amenazas, acoso ni burlas hacia personas concretas.",
  "Nada de datos personales: ni nombres completos, ni teléfonos, ni direcciones, ni @usuarios.",
  "Nada de contenido sexual explícito.",
  "Nada de acusaciones graves contra personas identificables.",
  "El salseo es sobre el plan, no sobre destrozar a nadie.",
];

const PHONE = /(?:\+?34[\s.-]?)?(?:[6789]\d{2})[\s.-]?\d{3}[\s.-]?\d{3}\b/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/i;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/i;
const URL_RE = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}/i;
const ADDRESS = /\b(calle|c\/|avda\.?|avenida|plaza|pza\.?)\s+[a-záéíóúñ]+(\s+[a-záéíóúñ]+)*\s*,?\s*(n[ºo°.]?\s*)?\d{1,4}\b/i;
const DNI = /\b\d{8}[a-hj-np-tv-z]\b/i;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@4]/g, (c) => ({ "0": "o", "@": "a", "4": "a" })[c] ?? c)
    .replace(/[13]/g, (c) => ({ "1": "i", "3": "e" })[c] ?? c);
}

const THREATS = [
  "te voy a matar", "te mato", "os voy a matar", "te voy a pegar", "te reviento", "sé donde vives", "se donde vives",
  "te voy a buscar", "vas a ver lo que te pasa", "ojala te mueras", "ojala se muera", "matate", "suicidate",
];
// Palabras completas (no subcadenas): "putada" o "mongolia" no deben bloquearse.
const HARASSMENT = [
  "puta", "putas", "zorra", "zorras", "maricon", "maricones", "subnormal", "subnormales", "retrasado", "retrasada",
  "gorda asquerosa", "sudaca", "sudacas", "moro de mierda", "negro de mierda", "guarra", "mongolo", "mongola", "travelo",
];
const SEXUAL = [
  "follar", "follando", "mamada", "polla", "coño", "cono mojado", "corrida", "porno", "nudes", "desnuda", "desnudo",
  "chupar", "tetas", "sexo anal", "pajote", "paja ",
];
const ACCUSATIONS = ["violador", "violo", "abuso de", "pedofilo", "camello", "vende droga", "le drogaron", "drogo a"];

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

/** Devuelve ok=false con un mensaje claro si el texto infringe las normas. */
export function checkContent(raw: string): ModerationResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "Escribe algo antes de publicar." };
  if (PHONE.test(text) || EMAIL.test(text) || DNI.test(text))
    return { ok: false, reason: "No compartas teléfonos, emails ni documentos. Protege la privacidad de todos." };
  if (HANDLE.test(text)) return { ok: false, reason: "No menciones perfiles (@usuario). El salseo es anónimo para todos." };
  if (ADDRESS.test(text)) return { ok: false, reason: "No publiques direcciones de personas." };
  if (URL_RE.test(text)) return { ok: false, reason: "No se permiten enlaces." };
  const n = normalize(text);
  if (THREATS.some((w) => n.includes(normalize(w)))) return { ok: false, reason: "Las amenazas no tienen cabida en PLANEA." };
  if (ACCUSATIONS.some((w) => n.includes(normalize(w))))
    return { ok: false, reason: "No hagas acusaciones graves contra personas. Si es algo serio, acude a las autoridades." };
  if (SEXUAL.some((w) => n.includes(normalize(w)))) return { ok: false, reason: "Nada de contenido sexual explícito." };
  if (HARASSMENT.some((w) => new RegExp(`(^|[^a-z])${normalize(w)}($|[^a-z])`).test(n)))
    return { ok: false, reason: "Ese lenguaje puede herir a alguien. Reformúlalo." };
  if (/(.)\1{9,}/.test(text) || (text.length > 20 && text === text.toUpperCase() && /[A-Z]{15,}/.test(text)))
    return { ok: false, reason: "Parece spam. Escribe con normalidad." };
  return { ok: true };
}
