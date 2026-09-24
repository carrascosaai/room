import { describe, expect, it } from "vitest";
import { LANGS } from "./lang";

describe("ejemplos de corrección", () => {
  it("son JSON válido en todos los idiomas", () => {
    for (const info of Object.values(LANGS)) {
      for (const shots of Object.values(info.fewShot)) {
        for (const [, answer] of shots ?? []) expect(() => JSON.parse(answer)).not.toThrow();
      }
    }
  });
});
