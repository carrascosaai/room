import { type Character, type Level, LEVEL_STYLE } from "../characters";
import type { Scenario } from "../scenarios";
import type { ChatMessage } from "./engine";
import { CORRECTION_TYPES } from "./parse";

/** Máximo de mensajes (usuario + personaje) que se envían al modelo. */
export const HISTORY_MESSAGES = 6;

type Turn = { role: "user" | "assistant"; text: string };

const MAX_WORDS: Record<Level, number> = { B1: 35, B2: 40, C1: 50 };

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

export function buildReplyMessages(
  character: Character,
  level: Level,
  history: Turn[],
  opts: { scenario?: Scenario; avoidQuestions?: string[] } = {},
): ChatMessage[] {
  const avoid = (opts.avoidQuestions ?? []).slice(-6);
  const system = [
    character.persona,
    "You are talking with a Spanish engineering student who is practising English with you.",
    opts.scenario?.setting ? `SITUATION: ${opts.scenario.setting}` : "",
    "",
    "RULES:",
    `- ${LEVEL_STYLE[level]}`,
    `- Reply in 1 to 3 short sentences (maximum ${MAX_WORDS[level]} words in total), like in a real spoken conversation.`,
    "- React to what they said, maybe add a small detail about yourself, then ask exactly ONE question at the end.",
    "- Never ask two questions. Only one question mark in your reply.",
    "- Do not correct their English and do not explain grammar. Just chat naturally.",
    "- If they use a Spanish word, tell them the English word in a natural way (for example: \"Ah, a 'carpeta' is a folder in English!\") and continue the conversation.",
    "- If they say they don't understand, say it again with simpler words.",
    "- Stay in character. Never say you are an AI. No emojis, no lists, no actions between asterisks.",
    avoid.length ? `- Do not repeat these questions you already asked: ${avoid.map((q) => `"${q}"`).join("; ")}` : "",
    "",
    'EXAMPLE of a good reply: "Oh, that sounds amazing! I went to Seville last year and loved it. What did you like most about the trip?"',
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
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
    `You are an English teacher for Spanish speakers. You check what a ${level} learner said in a casual spoken conversation.`,
    "Find real mistakes only: grammar, verb tenses, prepositions, articles, word order, wrong words, and Spanish words.",
    "Ignore capital letters, punctuation and contractions: this was spoken aloud and transcribed.",
    "Write every explanation in SPANISH, in one short sentence.",
    "Answer ONLY with JSON in this format:",
    '{"errors":[{"original":"wrong part copied from the learner","corrected":"natural English version","explanation":"una frase corta en español","type":"one of the types"}],"tip":"consejo corto en español"}',
    `Types: ${CORRECTION_TYPES.join(", ")}.`,
    'If there are no mistakes, use "errors":[] and give a short "tip" in Spanish with an English example to sound more native.',
    'If there are mistakes, "tip" can be "".',
  ].join("\n");

const FEW_SHOT: [string, string][] = [
  [
    'Question: "What did you do last weekend?"\nLearner: "Yesterday I go to the beach with my friends and we eat paella."',
    '{"errors":[{"original":"Yesterday I go to the beach","corrected":"Yesterday I went to the beach","explanation":"Con \'yesterday\' se usa el pasado simple: go → went.","type":"tiempo verbal"},{"original":"we eat paella","corrected":"we ate paella","explanation":"También en pasado: eat → ate.","type":"tiempo verbal"}],"tip":""}',
  ],
  [
    'Question: "Do you like sports?"\nLearner: "Yes, I like a lot the football."',
    '{"errors":[{"original":"I like a lot the football","corrected":"I really like football","explanation":"\'A lot\' no va entre el verbo y el objeto, y no se pone \'the\' al hablar de algo en general.","type":"orden de palabras"}],"tip":""}',
  ],
  [
    'Question: "What do you study?"\nLearner: "I am studying engineering in Córdoba."',
    '{"errors":[],"tip":"¡Correcto! Un nativo diría más bien: \\"I\'m doing engineering here in Córdoba.\\" Usa contracciones como I\'m para sonar natural."}',
  ],
  [
    'Question: "What do you need for class?"\nLearner: "I need to buy a carpeta."',
    '{"errors":[{"original":"a carpeta","corrected":"a folder","explanation":"\'Carpeta\' en inglés es \'folder\'.","type":"español"}],"tip":""}',
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
  const q = previousQuestion ? `Question: "${previousQuestion}"\n` : "";
  messages.push({ role: "user", content: `${q}Learner: "${userText}"` });
  return messages;
}

export const CORRECTION_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    errors: {
      type: "array",
      maxItems: 4,
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
