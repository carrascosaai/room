import { describe, expect, it } from "vitest";
import {
  advance,
  currentRound,
  optionsForPlayer,
  respondents,
  startGame,
  submitAnswer,
  createGame,
  addPlayer,
} from "@/game/engine";
import { projectView } from "@/game/view";
import { compatibility, profileSimilarity } from "@/game/compat";
import { assignMissions, evaluateMissions, MISSIONS } from "@/game/missions";
import { emptyProfile, applyChoice } from "@/game/behavior";
import { runSimulatedGame, standardCast } from "@/game/sim";
import type { GameState } from "@/game/types";

function room(n: number): GameState {
  let s = createGame("SALSA", { id: "h", nickname: "Host", lang: "es" }, "classic");
  for (let i = 1; i < n; i++) s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "es" }).state;
  return s;
}

function playthrough(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== "FINAL_RESULTS" && guard++ < 400) {
    if (s.phase === "ANSWERING") {
      const r = currentRound(s)!;
      for (const id of respondents(r)) {
        const opts = optionsForPlayer(r, id);
        if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
      }
    }
    s = advance(s);
  }
  return s;
}

describe("compatibility", () => {
  it("scores identical profiles as highly similar and opposite ones as low", () => {
    let a = emptyProfile();
    let b = emptyProfile();
    let c = emptyProfile();
    for (let i = 0; i < 12; i++) {
      a = applyChoice(a, { risk: 0.9, cooperation: 0.9 });
      b = applyChoice(b, { risk: 0.9, cooperation: 0.9 });
      c = applyChoice(c, { risk: -0.9, cooperation: -0.9 });
    }
    expect(profileSimilarity(a, b)).toBeGreaterThan(0.85);
    expect(profileSimilarity(a, c)).toBeLessThan(profileSimilarity(a, b) - 0.4);
  });

  it("compatibility() stays within [0,1] and flags groundedness", () => {
    const s = room(4);
    const c = compatibility({ ...s, behavior: { p1: emptyProfile(), h: emptyProfile() } } as GameState, "h", "p1");
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(1);
    expect(c.grounded).toBe(false);
  });
});

describe("secret missions", () => {
  it("assigns 1 mission for small rooms, 2 for big ones", () => {
    expect(assignMissions(room(4).players, 1).length).toBe(1);
    expect(assignMissions(room(7).players, 1).length).toBe(2);
  });

  it("target missions carry a target that isn't the holder", () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const m of assignMissions(room(8).players, seed)) {
        const def = MISSIONS.find((d) => d.id === m.missionId)!;
        if (def.needsTarget) {
          expect(m.targetId).toBeDefined();
          expect(m.targetId).not.toBe(m.playerId);
        }
      }
    }
  });

  it("every mission check is deterministic (same state => same result)", () => {
    const final = playthrough(startGame(room(6)).state);
    const a = evaluateMissions(final);
    const b = evaluateMissions(final);
    expect(a.map((m) => m.completed)).toEqual(b.map((m) => m.completed));
  });

  it("a player only ever sees their own mission, until the end", () => {
    const started = startGame(room(6)).state;
    const holderIds = new Set(started.missions.map((m) => m.playerId));
    const holderId = started.missions[0]!.playerId;
    const otherId = started.players.find((p) => !holderIds.has(p.id))!.id;
    expect(projectView(started, holderId).myMission).toBeDefined();
    expect(projectView(started, otherId).myMission).toBeUndefined();
    // completed is hidden mid-game
    expect(projectView(started, holderId).myMission?.completed).toBeUndefined();
  });
});

describe("salseo rounds run in a full game", () => {
  it("a full game produces an accusation, an affinity beat and a filled salseo report", () => {
    const { state } = runSimulatedGame(standardCast(), { seed: 7 });
    const kinds = new Set(state.aiMessages.map((m) => m.kind));
    expect(kinds.has("accusation")).toBe(true);
    expect(kinds.has("affinity")).toBe(true);
    expect(state.report).toBeDefined();
    expect(state.report!.missions.length).toBeGreaterThan(0);
    // compat / clash / mvp are computed
    expect(state.report).toHaveProperty("mostCompatible");
    expect(state.report).toHaveProperty("salseoMvpId");
  });

  it("accusation rounds never let you point at yourself", () => {
    let s = startGame(room(5)).state;
    let guard = 0;
    while (s.phase !== "FINAL_RESULTS" && guard++ < 400) {
      const r = currentRound(s);
      if (s.phase === "ANSWERING" && r?.kind === "accusation") {
        for (const id of r.participants) {
          const opts = optionsForPlayer(r, id).map((o) => o.id);
          expect(opts).not.toContain(id);
        }
      }
      if (s.phase === "ANSWERING" && r) {
        for (const id of respondents(r)) {
          const opts = optionsForPlayer(r, id);
          if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
        }
      }
      s = advance(s);
    }
    expect(s.phase).toBe("FINAL_RESULTS");
  });

  it("keeps salseo bounded — social theories don't dominate the whole game", () => {
    const { state } = runSimulatedGame(standardCast(), { seed: 3 });
    const total = state.rounds.length;
    const socialRounds = state.rounds.filter((r) =>
      ["accusation", "compat_probe"].includes(r.kind),
    ).length;
    expect(socialRounds / total).toBeLessThan(0.35);
  });
});
