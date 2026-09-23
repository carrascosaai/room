import { type Character, type Level, LEVEL_STYLE } from "../characters";
import type { ChatMessage } from "./engine";
import { CORRECTION_TYPES } from "./parse";

/** Máximo de mensajes (usuario + personaje) que se envían al modelo. */
export const HISTORY_MESSAGES = 6;

export function buildReplyMessages(
  character: Character,
  level: Level,
  history: { role: "user" | "assistant"; text: string }[],
): ChatMessage[] {
  const system = [
    character.persona,
    "You are talking with a Spanish engineering student who is practising English with you.",
    "",
    "RULES:",
    `- ${LEVEL_STYLE[level]}`,
    "- Reply in 1 to 3 short sentences (maximum 40 words in total).",
    "- React to what they said, maybe add a small detail about yourself, then ask exactly ONE question at the end.",
    "- Never ask two questions. Only one question mark in your reply.",
    "- Do not correct their English and do not explain grammar. Just chat naturally.",
    "- If they use a Spanish word, tell them the English word in a natural way (for example: \"Ah, a 'carpeta' is a folder in English!\") and continue the conversation.",
    "- Stay in character. Never say you are an AI. No emojis, no lists, no actions between asterisks.",
  ].join("\n");

  const recent = history.slice(-HISTORY_MESSAGES);
  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of recent) {
    messages.push({ role: m.role, content: m.text });
  }
  // Llama necesita que el primer turno tras el sistema sea del usuario.
  if (messages[1]?.role === "assistant") {
    messages.splice(1, 0, { role: "user", content: "Hi!" });
  }
  return messages;
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
