import { type Character, type Level, LEVEL_STYLE } from "../characters";
import type { Scenario } from "../scenarios";
import type { ChatMessage } from "./engine";
import { CORRECTION_TYPES } from "./parse";

/** Máximo de mensajes (usuario + personaje) que se envían al modelo. */
export const HISTORY_MESSAGES = 6;

type Turn = { role: "user" | "assistant"; text: string };

const MAX_WORDS: Record<Level, number> = { B1: 25, B2: 30, C1: 35 };

/** Une mensajes seguidos del mismo rol (p. ej. tras «No entiendo»). */
function mergeTurns(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.text = `${last.text} ${t.text}`;
    else out.push({ ...t });
  }
  return out;
}

/**
 * Prompt corto a propósito: cada token del prompt se procesa en cada turno,
 * así que menos texto = respuesta antes.
 */
export function buildReplyMessages(
  character: Character,
  level: Level,
  history: Turn[],
  opts: { scenario?: Scenario } = {},
): ChatMessage[] {
  const system = [
    character.persona,
    "You're on a voice call with a Spanish engineering student practising English.",
    opts.scenario?.setting ? `Situation: ${opts.scenario.setting}` : "",
    `Talk like a real person on a call: 1 or 2 short sentences, max ${MAX_WORDS[level]} words. ${LEVEL_STYLE[level]} React to what they said, then ask ONE short question. Never correct them. If they use a Spanish word, say it in English and carry on. Never say you're an AI. No emojis or lists.`,
  ]
    .filter(Boolean)
    .join("\n");

  const recent = mergeTurns(history.slice(-HISTORY_MESSAGES));
  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of recent) messages.push({ role: m.role, content: m.text });
  // Llama necesita que el primer turno tras el sistema sea del usuario.
  if (messages[1]?.role === "assistant") messages.splice(1, 0, { role: "user", content: "Hi!" });
  return messages;
}

/** «No entiendo»: repetir lo último más fácil y más despacio. */
export function buildRephraseMessages(character: Character, lastReply: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        `TASK: REPHRASE. You are ${character.name}. The learner did not understand your last message.`,
        "Say the same thing again using very simple English (A2 level): short sentences, very common words.",
        "Keep the same question at the end. Maximum 30 words. Answer only with the new message.",
      ].join("\n"),
    },
    { role: "user", content: `Your last message: "${lastReply}"` },
  ];
}

/** «¿Qué digo?»: tres respuestas posibles con su traducción. */
export function buildSuggestionMessages(level: Level, lastReply: string, context: Turn[]): ChatMessage[] {
  const ctx = context
    .slice(-4)
    .map((t) => `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`)
    .join("\n");
  return [
    {
      role: "system",
      content: [
        `TASK: SUGGEST. You help a Spanish ${level} learner of English who doesn't know what to answer.`,
        "Write 3 different natural answers the learner could say to the partner's last message.",
        "Each answer: 1 or 2 short sentences, first person, at the learner's level. Make them different (positive, negative, detailed).",
        "Add a Spanish translation to each one.",
        'Answer ONLY with JSON: {"suggestions":[{"en":"English answer","es":"traducción al español"}]}',
      ].join("\n"),
    },
    { role: "user", content: `${ctx ? ctx + "\n" : ""}Partner's last message: "${lastReply}"` },
  ];
}

export const SUGGESTION_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: { en: { type: "string" }, es: { type: "string" } },
        required: ["en", "es"],
      },
    },
  },
  required: ["suggestions"],
});

/** Traducir un mensaje del personaje al español. */
export function buildTranslateMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "TASK: TRANSLATE. Translate the English text into natural Spanish from Spain. Answer ONLY with the translation, nothing else.",
    },
    { role: "user", content: "Do you fancy grabbing a coffee later?" },
    { role: "assistant", content: "¿Te apetece tomar un café luego?" },
    { role: "user", content: text },
  ];
}

const CORRECTION_SYSTEM = (level: Level) =>
  [
    `You correct a Spanish ${level} learner's spoken English. Only real mistakes (grammar, tense, prepositions, articles, word order, wrong or Spanish words). Ignore punctuation and capitals.`,
    `JSON only: {"errors":[{"original":"wrong part","corrected":"natural version","explanation":"una frase corta en español","type":"${CORRECTION_TYPES.join("|")}"}],"tip":""}`,
    'No mistakes: "errors":[] and a short "tip" in Spanish to sound more native.',
  ].join("\n");

const FEW_SHOT: [string, string][] = [
  [
    'Learner: "Yesterday I go to the beach and I like a lot."',
    '{"errors":[{"original":"I go","corrected":"I went","explanation":"Con \'yesterday\' va pasado: go → went.","type":"tiempo verbal"},{"original":"I like a lot","corrected":"I really liked it","explanation":"\'Like\' necesita objeto (it) y va en pasado.","type":"gramática"}],"tip":""}',
  ],
  [
    'Learner: "I am studying engineering here."',
    '{"errors":[],"tip":"¡Perfecto! Suena más natural con contracción: \\"I\'m studying engineering here.\\""}',
  ],
];

export function buildCorrectionMessages(
  level: Level,
  previousQuestion: string | undefined,
  userText: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: CORRECTION_SYSTEM(level) }];
  for (const [u, a] of FEW_SHOT) {
    messages.push({ role: "user", content: u });
    messages.push({ role: "assistant", content: a });
  }
  const q = previousQuestion ? `(Answering: "${previousQuestion}")\n` : "";
  messages.push({ role: "user", content: `${q}Learner: "${userText}"` });
  return messages;
}

export const CORRECTION_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    errors: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
          explanation: { type: "string" },
          type: { type: "string", enum: CORRECTION_TYPES },
        },
        required: ["original", "corrected", "explanation", "type"],
      },
    },
    tip: { type: "string" },
  },
  required: ["errors", "tip"],
});
