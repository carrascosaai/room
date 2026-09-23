import { describe, expect, it } from "vitest";
import { computeErrorStats, parseExpressions } from "./summary";

const messages = [
  { role: "assistant" as const, text: "To be honest, I'm still getting used to the heat. What about you?" },
  {
    role: "user" as const,
    text: "Yesterday I go to the river",
    corrections: {
      errors: [
        { original: "I go", corrected: "I went", explanation: "Pasado simple.", type: "tiempo verbal" as const },
        { original: "to the river", corrected: "down to the river", explanation: "Más natural.", type: "preposición" as const },
      ],
    },
  },
  {
    role: "user" as const,
    text: "I eat paella",
    corrections: { errors: [{ original: "I eat", corrected: "I ate", explanation: "Pasado.", type: "tiempo verbal" as const }] },
  },
];

describe("computeErrorStats", () => {
  it("groups by type, most frequent first", () => {
    const stats = computeErrorStats(messages);
    expect(stats[0]).toMatchObject({ type: "tiempo verbal", count: 2 });
    expect(stats[1]).toMatchObject({ type: "preposición", count: 1 });
  });
});

describe("parseExpressions", () => {
  it("keeps valid items, prefers ones from the conversation, drops junk", () => {
    const raw = JSON.stringify({
      expressions: [
        { en: "break the ice", es: "romper el hielo", example: "x" },
        { en: "to be honest", es: "la verdad es que", example: "To be honest, I'm tired." },
        { en: "a very very long expression that has far too many words", es: "x", example: "" },
        { en: "to be honest", es: "dup", example: "" },
        { en: "", es: "vacío", example: "" },
        null,
      ],
    });
    const out = parseExpressions(raw, messages);
    expect(out[0].en).toBe("to be honest");
    expect(out.map((e) => e.en)).toContain("break the ice");
    expect(out.filter((e) => e.en === "to be honest")).toHaveLength(1);
  });

  it("falls back to corrected phrases when the model output is garbage", () => {
    const out = parseExpressions("lo siento, no puedo", messages);
    // Solo frases de 3+ palabras: «I went» o «I ate» no sirven como expresión
    expect(out.map((e) => e.en)).toEqual(["down to the river"]);
  });
});
