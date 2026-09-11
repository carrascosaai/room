import { describe, expect, it, vi, afterEach } from "vitest";

const complete = vi.fn(async () => JSON.stringify({ en: "Polished EN", es: "Polished ES" }));

vi.mock("@/ai/provider", () => ({
  getAiProvider: () => ({
    available: true,
    label: "mock",
    complete,
  }),
}));

import { polishLatestAiMessage } from "@/ai/narrator";
import { addPlayer, createGame, startGame } from "@/game/engine";
import type { GameState } from "@/game/types";

function baseGame(): GameState {
  let s = createGame("NAR1", { id: "p0", nickname: "P0", lang: "en" }, "classic");
  for (let i = 1; i < 4; i++) s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "en" }).state;
  return startGame(s).state;
}

function withMessage(kind: string): GameState {
  const s = baseGame();
  return {
    ...s,
    aiMessages: [
      ...s.aiMessages,
      { id: "m1", kind: kind as never, text: { en: "Original EN", es: "Original ES" }, roundIndex: 0, at: Date.now() },
    ],
  };
}

describe("polishLatestAiMessage — cost-safety guard", () => {
  afterEach(() => {
    complete.mockClear();
  });

  it("polishes an unpolished message and marks it polished", async () => {
    const s = withMessage("observation");
    const next = await polishLatestAiMessage(s);
    const last = next.aiMessages[next.aiMessages.length - 1]!;
    expect(complete).toHaveBeenCalledTimes(1);
    expect(last.polished).toBe(true);
    expect(last.text).toEqual({ en: "Polished EN", es: "Polished ES" });
  });

  it("never calls the provider again once a message is polished", async () => {
    const s = withMessage("throne_result");
    const once = await polishLatestAiMessage(s);
    const twice = await polishLatestAiMessage(once);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(twice).toBe(once);
  });

  it("works for a director-only message kind, not just the original four", async () => {
    const s = withMessage("whisper_result");
    const next = await polishLatestAiMessage(s);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(next.aiMessages[next.aiMessages.length - 1]!.polished).toBe(true);
  });
});
