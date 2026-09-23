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
      await sleep(300);
      const last = messages[messages.length - 1]?.content ?? "";
      switch (opts.tag) {
        case "correct":
          if (/\bgo\b/i.test(last)) {
            return '{"errors":[{"original":"I go","corrected":"I went","explanation":"Para hablar del pasado usa el pasado simple: go → went.","type":"tiempo verbal"}],"tip":""}';
          }
          return '{"errors":[],"tip":"¡Bien dicho! Para sonar más natural usa contracciones: \\"I\'m\\" en vez de \\"I am\\"."}';
        case "expressions":
          return '{"expressions":[{"en":"to be honest","es":"la verdad es que","example":"To be honest, I\'m still getting used to the heat."},{"en":"no bother","es":"no hay problema (irlandés)","example":"No bother, I get it."},{"en":"getting used to","es":"acostumbrarse a","example":"I\'m getting used to the heat."}]}';
        case "suggest":
          return '{"suggestions":[{"en":"Yes, I go there quite often with my friends.","es":"Sí, voy bastante a menudo con mis amigos."},{"en":"Not really, I prefer the old town at night.","es":"La verdad es que no, prefiero el casco antiguo de noche."},{"en":"I went last month and it was beautiful.","es":"Fui el mes pasado y era precioso."}]}';
        case "translate":
          return "Ah, suena genial. Esta mañana fui a la Mezquita y fue increíble. ¿Has estado allí hace poco?";
        case "rephrase":
          return "Sorry! I mean: I visited the Mezquita today. It was very nice. Do you go there?";
      }
      const reply = REPLIES[n++ % REPLIES.length];
      let text = "";
      for (const word of reply.split(" ")) {
        text += (text ? " " : "") + word;
        await sleep(35);
        if (opts.onText?.(text)) break;
      }
      return text;
    },
    async unload() {},
  };
}
