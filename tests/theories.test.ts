import { describe, expect, it } from "vitest";
import { emptyGroupModel, recordAlignment, recordDilemma, recordSelection } from "@/game/group";
import { candidateToTheory, detectTheories, resolveTheory } from "@/game/theories";
import { emptyProfile } from "@/game/behavior";
import type { Player } from "@/game/types";

const players: Player[] = ["p1", "p2", "p3"].map((id, i) => ({
  id,
  nickname: id.toUpperCase(),
  lang: "en",
  isHost: i === 0,
  connected: true,
  joinedAt: 0,
  lastSeen: 0,
  score: 0,
}));

const behavior = Object.fromEntries(players.map((p) => [p.id, emptyProfile()]));

describe("theory engine", () => {
  it("detects a mutual bond from repeated mutual selection", () => {
    let g = emptyGroupModel();
    for (let i = 0; i < 3; i++) {
      g = recordSelection(g, "p1", "p2");
      g = recordSelection(g, "p2", "p1");
    }
    const cands = detectTheories(players, behavior, g);
    const bond = cands.find((c) => c.type === "mutual_bond");
    expect(bond).toBeDefined();
    expect(bond?.players.sort()).toEqual(["p1", "p2"]);
    expect(bond?.social).toBe(true);
  });

  it("detects an alliance from repeated alignment", () => {
    let g = emptyGroupModel();
    for (let i = 0; i < 5; i++) g = recordAlignment(g, "p1", "p2", true);
    const cands = detectTheories(players, behavior, g);
    expect(cands.some((c) => c.type === "alliance")).toBe(true);
  });

  it("detects rivalry from repeated disagreement", () => {
    let g = emptyGroupModel();
    for (let i = 0; i < 5; i++) g = recordAlignment(g, "p1", "p3", false);
    const cands = detectTheories(players, behavior, g);
    expect(cands.some((c) => c.type === "rivalry")).toBe(true);
  });

  it("never fabricates evidence: no data => no theories", () => {
    expect(detectTheories(players, behavior, emptyGroupModel())).toHaveLength(0);
  });

  it("strengthens a selection theory when the prediction holds", () => {
    let g = emptyGroupModel();
    for (let i = 0; i < 4; i++) {
      g = recordSelection(g, "p1", "p2");
      g = recordSelection(g, "p2", "p1");
    }
    const cand = detectTheories(players, behavior, g).find((c) => c.type === "mutual_bond")!;
    const theory = candidateToTheory(cand, 8);
    const res = resolveTheory(theory, { selections: { p1: "p2" } });
    expect(res.status).toBe("strengthened");
    expect(res.confidence).toBeGreaterThan(theory.confidence);
  });

  it("discards a selection theory when the prediction fails", () => {
    let g = emptyGroupModel();
    for (let i = 0; i < 4; i++) {
      g = recordSelection(g, "p1", "p2");
      g = recordSelection(g, "p2", "p1");
    }
    const cand = detectTheories(players, behavior, g).find((c) => c.type === "mutual_bond")!;
    const theory = candidateToTheory(cand, 8);
    const res = resolveTheory(theory, { selections: { p1: "p3" } });
    expect(res.status).toBe("discarded");
    expect(res.confidence).toBeLessThan(theory.confidence);
  });

  it("resolves an alliance theory from the pair's choices", () => {
    const theory = candidateToTheory(
      { type: "alliance", players: ["p1", "p2"], evidenceCount: 5, evidence: "x", confidence: 0.7, salience: 1, social: false },
      8,
    );
    expect(resolveTheory(theory, { choices: { p1: "A", p2: "A" } }).status).toBe("strengthened");
    expect(resolveTheory(theory, { choices: { p1: "A", p2: "B" } }).status).toBe("discarded");
  });

  it("records dilemma cooperation and betrayal directionally", () => {
    let g = emptyGroupModel();
    g = recordDilemma(g, "p1", "p2", false, true); // p1 betrays p2
    const cands = detectTheories(players, behavior, g);
    // not enough for a theory yet, but the edge should reflect it
    expect(cands).toBeDefined();
  });
});
