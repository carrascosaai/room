import type { ChatMessage, CompleteOptions, LLM } from "./engine";

// Motor falso para probar la interfaz sin WebGPU (añade ?demo a la URL).
const REPLIES = [
  "Ah, that sounds lovely. I went to the Mezquita this morning and it was amazing. Have you been there recently? Do you go often?",
  "Grand! I'm still getting used to the heat, to be honest. What do you usually do in the evenings here?",
  "No bother, I get it. Studying engineering must be tough. What's your favourite subject?",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockEngine(): LLM {
  let n = 0;
  return {
    async complete(messages: ChatMessage[], opts: CompleteOptions = {}) {
      await sleep(400);
      const system = messages[0]?.content ?? "";
      if (/English teacher/.test(system)) {
        const last = messages[messages.length - 1]?.content ?? "";
        if (/\bgo\b/i.test(last)) {
          return '{"errors":[{"original":"I go","corrected":"I went","explanation":"Para hablar del pasado usa el pasado simple: go → went.","type":"tiempo verbal"}],"tip":""}';
        }
        return '{"errors":[],"tip":"¡Bien dicho! Para sonar más natural usa contracciones: \\"I\'m\\" en vez de \\"I am\\"."}';
      }
      if (/"expressions"/.test(system)) {
        return '{"expressions":[{"en":"to be honest","es":"la verdad es que","example":"To be honest, I\'m still getting used to the heat."},{"en":"no bother","es":"no hay problema (irlandés)","example":"No bother, I get it."},{"en":"getting used to","es":"acostumbrarse a","example":"I\'m getting used to the heat."}]}';
      }
      const reply = REPLIES[n++ % REPLIES.length];
      let text = "";
      for (const word of reply.split(" ")) {
        text += (text ? " " : "") + word;
        await sleep(40);
        if (opts.onText?.(text)) break;
      }
      return text;
    },
    async unload() {},
  };
}
