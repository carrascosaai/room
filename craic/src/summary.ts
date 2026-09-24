import type { Character, Level } from "./characters";
import { getUiLang } from "./i18n";
import { infoOf, NATIVE_NAME, type TargetLang } from "./lang";
import type { ChatMessage } from "./llm/engine";
import { parseJsonLoose, type Correction, type CorrectionType } from "./llm/parse";

export interface Expression {
  /** La expresión en el idioma que se practica (se llama «en» por compatibilidad) */
  en: string;
  es: string;
  example: string;
  /** Idioma de la expresión (sin él, inglés) */
  lang?: TargetLang;
}

export interface ErrorStat {
  type: CorrectionType;
  count: number;
  examples: Pick<Correction, "original" | "corrected">[];
}

interface SummaryMsg {
  role: "user" | "assistant";
  text: string;
  corrections?: { errors: Correction[] };
}

/** Agrupa los errores por tipo, de más a menos repetido. */
export function computeErrorStats(messages: SummaryMsg[]): ErrorStat[] {
  const map = new Map<CorrectionType, ErrorStat>();
  for (const m of messages) {
    for (const e of m.corrections?.errors ?? []) {
      const stat = map.get(e.type) ?? { type: e.type, count: 0, examples: [] };
      stat.count++;
      if (stat.examples.length < 3) stat.examples.push({ original: e.original, corrected: e.corrected });
      map.set(e.type, stat);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function buildExpressionMessages(character: Character, level: Level, messages: SummaryMsg[]): ChatMessage[] {
  const lines: string[] = [];
  for (const m of messages.slice(-16)) {
    lines.push(`${m.role === "assistant" ? character.name : "Learner"}: ${m.text}`);
  }
  let transcript = lines.join("\n");
  if (transcript.length > 2500) transcript = transcript.slice(-2500);
  const fixes = messages
    .flatMap((m) => m.corrections?.errors ?? [])
    .map((e) => `- ${e.corrected}`)
    .slice(0, 8)
    .join("\n");

  const name = infoOf(character).name;
  const system = [
    `You help a ${NATIVE_NAME[getUiLang()]}-speaking learner of ${name} (level ${level}).`,
    `From the conversation, choose 6 to 8 useful, natural ${name} expressions (2 to 6 words each) that the learner can reuse.`,
    "Prefer phrases the native speaker used and the corrected versions of the learner's mistakes. Do not choose single basic words.",
    `For each one give a natural ${NATIVE_NAME[getUiLang()]} translation and a short example sentence in ${name}.`,
    `Answer ONLY with JSON: {"expressions":[{"en":"expression in ${name}","es":"translation in ${NATIVE_NAME[getUiLang()]}","example":"Short example sentence in ${name}."}]}`,
  ].join("\n");
  const user = `CONVERSATION:\n${transcript}${fixes ? `\n\nCORRECTED LEARNER PHRASES:\n${fixes}` : ""}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export const EXPRESSION_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    expressions: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          en: { type: "string" },
          es: { type: "string" },
          example: { type: "string" },
        },
        required: ["en", "es", "example"],
      },
    },
  },
  required: ["expressions"],
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Parseo tolerante + filtros. Si hay pocas, se completa con las correcciones. */
export function parseExpressions(raw: string, messages: SummaryMsg[]): Expression[] {
  const data = parseJsonLoose(raw) as { expressions?: unknown } | null;
  const list = Array.isArray(data?.expressions) ? data.expressions : Array.isArray(data) ? data : [];
  const convo = messages.map((m) => m.text).join(" ").toLowerCase();
  const seen = new Set<string>();
  const found: (Expression & { inConvo: boolean })[] = [];

  for (const item of list as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const en = str(r.en, 80).replace(/^["'“]|["'”.]$/g, "");
    const es = str(r.es, 120);
    const example = str(r.example, 200);
    const words = en.split(" ").length;
    if (!en || !es || words > 8 || en.toLowerCase() === es.toLowerCase()) continue;
    const key = en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ en, es, example, inConvo: convo.includes(key) });
  }
  // Primero las que salieron de verdad en la conversación
  found.sort((a, b) => Number(b.inConvo) - Number(a.inConvo));
  const result: Expression[] = found.slice(0, 10).map(({ en, es, example }) => ({ en, es, example }));

  if (result.length < 5) {
    for (const m of messages) {
      for (const e of m.corrections?.errors ?? []) {
        if (result.length >= 8) break;
        const key = e.corrected.toLowerCase();
        const words = e.corrected.split(" ").length;
        if (seen.has(key) || words < 3 || words > 10) continue;
        seen.add(key);
        result.push({ en: e.corrected, es: e.explanation || `en lugar de «${e.original}»`, example: "" });
      }
    }
  }
  return result;
}
