import { describe, expect, it } from "vitest";
import { checkContent } from "@/lib/moderation";

describe("filtro de contenido", () => {
  it.each([
    "Llámame al 612 345 678",
    "escríbeme a fulano@gmail.com",
    "pregunta a @juanito_99",
    "vive en calle Mayor 12",
    "te voy a matar",
    "es un violador",
    "mira https://spam.com",
  ])("bloquea: %s", (t) => expect(checkContent(t).ok).toBe(false));

  it.each(["¿A qué hora se llena esto?", "Qué putada que cierren a las 3", "La pista de abajo es mejor", "Confieso que salí con el sol"])(
    "permite: %s",
    (t) => expect(checkContent(t).ok).toBe(true),
  );
});
