// Limpieza y parseo tolerante de lo que devuelve el modelo.
// Nada de aquí lanza excepciones: si la salida viene mal, se devuelve algo usable.

export const CORRECTION_TYPES = [
  "gramática",
  "tiempo verbal",
  "preposición",
  "artículo",
  "orden de palabras",
  "vocabulario",
  "español",
] as const;

export type CorrectionType = (typeof CORRECTION_TYPES)[number] | "otro";

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: CorrectionType;
}

export interface CorrectionResult {
  errors: Correction[];
  tip: string;
}

export const FALLBACK_REPLY = "Sorry, I didn't catch that. Could you say it again?";

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;

/** Separa en frases conservando la puntuación final. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/g) ?? [];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function basicClean(raw: string, name?: string): string {
  let t = raw ?? "";
  t = t.replace(/<think>[\s\S]*?(<\/think>|$)/gi, " ");
  t = t.replace(/<\|[^|]*\|>/g, " "); // tokens especiales
  t = t.replace(/\*[^*\n]{1,60}\*/g, " "); // *smiles*
  t = t.replace(/[*_#`]+/g, "");
  t = t.replace(EMOJI_RE, "");
  // Si el modelo intenta escribir también el turno del usuario, cortamos ahí.
  t = t.split(/\n\s*(?:user|student|learner|you|me)\s*:/i)[0];
  if (name) t = t.replace(new RegExp(`^\\s*${name}\\s*:\\s*`, "i"), "");
  t = t.replace(/^\s*(?:assistant|ai)\s*:\s*/i, "");
  t = t.replace(/\s+/g, " ").trim();
  // Comillas que envuelven toda la respuesta
  const m = t.match(/^["“](.*)["”]$/);
  if (m && !m[1].includes('"')) t = m[1].trim();
  return t;
}

/**
 * Deja la respuesta del personaje con como mucho UNA pregunta (la corta justo
 * después de la primera frase interrogativa) y sin frases a medias.
 */
export function cleanReply(raw: string, name?: string): string {
  const t = basicClean(raw, name);
  let sentences = splitSentences(t);
  const qIndex = sentences.findIndex((s) => /\?["'’”)]*$/.test(s));
  if (qIndex >= 0) {
    sentences = sentences.slice(0, qIndex + 1);
  } else if (sentences.length > 1 && !/[.!?]["'’”)]*$/.test(sentences[sentences.length - 1])) {
    // Última frase cortada por el límite de tokens
    sentences = sentences.slice(0, -1);
  }
  // Como mucho 4 frases: las últimas (las que llevan a la pregunta).
  if (sentences.length > 4) sentences = sentences.slice(-4);
  const out = sentences.join(" ").trim();
  return out.length >= 2 ? out : FALLBACK_REPLY;
}

/** Para el streaming: ¿ya hay una pregunta completa? Entonces paramos. */
export function hasCompleteQuestion(partial: string): boolean {
  return /\?/.test(basicClean(partial));
}

/** Busca y parsea el primer objeto JSON del texto, reparando fallos típicos. */
export function parseJsonLoose(raw: string): unknown {
  if (!raw) return null;
  let t = raw.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{");
  if (start < 0) return null;
  t = t.slice(start);
  const candidates: string[] = [];
  const end = t.lastIndexOf("}");
  if (end > 0) candidates.push(t.slice(0, end + 1));
  candidates.push(balance(t));
  for (const c of candidates) {
    for (const variant of [c, repair(c)]) {
      try {
        return JSON.parse(variant);
      } catch {
        /* siguiente */
      }
    }
  }
  return null;
}

function repair(s: string): string {
  return s
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([a-zA-Z_]+)\s*:/g, '$1"$2":');
}

/** Cierra comillas, corchetes y llaves que quedaron abiertos (salida cortada). */
function balance(s: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let out = "";
  for (const ch of s) {
    out += ch;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 0) return out;
    }
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "").replace(/"\s*:\s*"?$/, '":""');
  while (stack.length) out += stack.pop();
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function asString(v: unknown, max = 300): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toType(v: unknown): CorrectionType {
  const s = asString(v).toLowerCase();
  const found = CORRECTION_TYPES.find((t) => t === s);
  if (found) return found;
  if (/tense|tiempo/.test(s)) return "tiempo verbal";
  if (/prep/.test(s)) return "preposición";
  if (/art/.test(s)) return "artículo";
  if (/order|orden/.test(s)) return "orden de palabras";
  if (/vocab|word|palabra/.test(s)) return "vocabulario";
  if (/span|espa/.test(s)) return "español";
  if (/gram/.test(s)) return "gramática";
  return "otro";
}

/** Palabras en común para descartar "correcciones" inventadas que no vienen del usuario. */
function overlaps(original: string, userText: string): boolean {
  const u = norm(userText);
  const o = norm(original);
  if (!o) return false;
  if (u.includes(o)) return true;
  const words = o.split(" ").filter((w) => w.length > 1);
  if (!words.length) return false;
  const uw = new Set(u.split(" "));
  const hits = words.filter((w) => uw.has(w)).length;
  return hits / words.length >= 0.5;
}

export function parseCorrections(raw: string, userText: string): CorrectionResult {
  const data = parseJsonLoose(raw) as { errors?: unknown; tip?: unknown } | null;
  let errorsIn: unknown[] = [];
  let tip = "";
  if (data && typeof data === "object") {
    if (Array.isArray(data.errors)) errorsIn = data.errors;
    tip = asString(data.tip, 400);
  } else {
    errorsIn = extractPairsFromText(raw);
  }

  const seen = new Set<string>();
  const errors: Correction[] = [];
  for (const e of errorsIn) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const original = asString(r.original, 200);
    const corrected = asString(r.corrected, 200);
    if (!original || !corrected) continue;
    if (norm(original) === norm(corrected)) continue; // "corrección" sin cambios
    if (!overlaps(original, userText)) continue;
    const key = norm(original);
    if (seen.has(key)) continue;
    seen.add(key);
    errors.push({
      original,
      corrected,
      explanation: asString(r.explanation, 300),
      type: toType(r.type),
    });
    if (errors.length >= 4) break;
  }
  if (errors.length) tip = tip && !/^(none|n\/a|-)$/i.test(tip) ? tip : "";
  return { errors, tip };
}

/** Último recurso si no hay JSON: busca "original" / "corrected" sueltos. */
function extractPairsFromText(raw: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = /"?original"?\s*:\s*"([^"]+)"[\s\S]*?"?corrected"?\s*:\s*"([^"]+)"(?:[\s\S]*?"?explanation"?\s*:\s*"([^"]*)")?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw ?? ""))) {
    out.push({ original: m[1], corrected: m[2], explanation: m[3] ?? "" });
  }
  return out;
}

// ---------- Utilidades para las ayudas de la conversación ----------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Aplica las correcciones a la frase del usuario para mostrar la versión completa. */
export function applyCorrections(text: string, errors: Correction[]): string | null {
  let out = text;
  let changed = false;
  for (const e of errors) {
    const re = new RegExp(escapeRe(e.original.trim()).replace(/\s+/g, "\\s+"), "i");
    if (re.test(out)) {
      out = out.replace(re, e.corrected.trim());
      changed = true;
    }
  }
  if (!changed) return null;
  out = out.replace(/\s+/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** La pregunta de una respuesta del personaje (la última frase con «?»). */
export function questionOf(reply: string): string | null {
  const q = splitSentences(reply).filter((s) => s.includes("?"));
  return q.length ? q[q.length - 1] : null;
}

const qWords = (s: string) =>
  new Set(
    norm(s)
      .split(" ")
      .filter((w) => w.length > 2 && !["you", "the", "and", "are", "what", "your", "have", "did", "for", "any"].includes(w)),
  );

/** ¿Dos preguntas son prácticamente la misma? (para no repetir) */
export function similarQuestion(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = qWords(a);
  const wb = qWords(b);
  if (!wa.size || !wb.size) return false;
  let inter = 0;
  wa.forEach((w) => wb.has(w) && inter++);
  return inter / Math.min(wa.size, wb.size) >= 0.75 && inter >= 2;
}

export interface Suggestion {
  en: string;
  es: string;
}

/** Sugerencias de respuesta: JSON {"suggestions":[{en,es}]} o, si falla, líneas sueltas. */
export function parseSuggestions(raw: string): Suggestion[] {
  const data = parseJsonLoose(raw) as { suggestions?: unknown } | null;
  let list: unknown[] = Array.isArray(data?.suggestions) ? (data!.suggestions as unknown[]) : [];
  if (!list.length) {
    list = (raw ?? "")
      .split("\n")
      .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
      .filter((l) => /[a-z]/i.test(l) && !l.startsWith("{"))
      .map((l) => {
        const [en, es] = l.split(/\s+[—–-]\s+|\s*\|\s*/);
        return { en, es: es ?? "" };
      });
  }
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const en = asString(r.en, 160).replace(/^["“]|["”]$/g, "");
    const es = asString(r.es, 200).replace(/^["“(]|["”)]$/g, "");
    if (!en || en.split(" ").length > 30 || seen.has(norm(en))) continue;
    seen.add(norm(en));
    out.push({ en, es });
    if (out.length >= 3) break;
  }
  return out;
}

/** Limpia una traducción: sin etiquetas, comillas ni explicaciones de más. */
export function cleanTranslation(raw: string): string {
  let t = (raw ?? "").replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();
  t = t.replace(/^(traducci[oó]n|translation|spanish|español)\s*:\s*/i, "");
  t = t.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  const m = t.match(/^["“«](.*)["”»]$/);
  if (m) t = m[1].trim();
  return t.slice(0, 500);
}
