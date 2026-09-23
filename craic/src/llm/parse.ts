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
