import { describe, expect, it } from "vitest";
import { packForCloud } from "./tts";

describe("packForCloud", () => {
  it("junta una respuesta normal en una sola petición", () => {
    expect(packForCloud(["Oh, deadly!", "Who did you go with?", "Was it sunny?"])).toEqual([
      "Oh, deadly! Who did you go with? Was it sunny?",
    ]);
  });
  it("no pasa de 400 caracteres por trozo", () => {
    const long = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i} of a very long answer.`);
    const parts = packForCloud(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 400)).toBe(true);
    expect(parts.join(" ")).toBe(long.join(" "));
  });
  it("parte una frase enorme por espacios", () => {
    const huge = "word ".repeat(200).trim();
    const parts = packForCloud([huge]);
    expect(parts.every((p) => p.length <= 400)).toBe(true);
    expect(parts.join(" ").split(" ").length).toBe(200);
  });
});
