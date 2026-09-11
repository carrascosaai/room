import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advance,
  createGame,
  currentRound,
  optionsForPlayer,
  respondents,
  startGame,
  submitAnswer,
} from "@/game/engine";
import { projectView } from "@/game/view";
import type { GameState } from "@/game/types";

function room(n: number, seed = 1): GameState {
  let s = createGame("DIR1", { id: "p0", nickname: "P0", lang: "en" }, "director");
  s = { ...s, seed };
  for (let i = 1; i < n; i++) s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "en" }).state;
  return s;
}

/** drive a full director-mode game, always picking the first legal option */
function playthrough(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== "FINAL_RESULTS" && guard++ < 600) {
    if (s.phase === "ANSWERING") {
      const round = currentRound(s)!;
      for (const id of respondents(round)) {
        const opts = optionsForPlayer(round, id);
        if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
      }
    }
    s = advance(s);
  }
  return s;
}

describe("director mode — full game", () => {
  it("reaches FINAL_RESULTS with a director log and a confession", () => {
    const final = playthrough(startGame(room(6)).state);
    expect(final.phase).toBe("FINAL_RESULTS");
    expect(final.directorLog.length).toBeGreaterThan(0);
    expect(final.report).toBeDefined();
    expect(final.report!.directorLog.length).toBeGreaterThan(0);
    expect(final.aiMessages.some((m) => m.kind === "confession")).toBe(true);
  });

  it("plays a good mix of mechanics, not just one repeated", () => {
    const final = playthrough(startGame(room(7, 42)).state);
    const kinds = new Set(final.rounds.map((r) => r.kind));
    expect(kinds.has("interrogation")).toBe(true);
    expect(kinds.has("movement")).toBe(true);
    // deal and prophecy are common but not guaranteed on every seed/size — just
    // check the game isn't monotone (more than 3 distinct kinds used overall)
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it("never runs the exact same mechanic three rounds in a row", () => {
    const final = playthrough(startGame(room(6, 7)).state);
    const kinds = final.rounds.map((r) => r.kind);
    for (let i = 0; i < kinds.length - 2; i++) {
      const triple = kinds[i] === kinds[i + 1] && kinds[i + 1] === kinds[i + 2];
      expect(triple).toBe(false);
    }
  });

  it("keeps reputation values inside [0, 100] throughout", () => {
    let s = startGame(room(6, 3)).state;
    let guard = 0;
    while (s.phase !== "FINAL_RESULTS" && guard++ < 600) {
      if (s.phase === "ANSWERING") {
        const round = currentRound(s)!;
        for (const id of respondents(round)) {
          const opts = optionsForPlayer(round, id);
          if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
        }
      }
      s = advance(s);
      for (const p of s.players) {
        expect(p.trust).toBeGreaterThanOrEqual(0);
        expect(p.trust).toBeLessThanOrEqual(100);
        expect(p.suspicion).toBeGreaterThanOrEqual(0);
        expect(p.suspicion).toBeLessThanOrEqual(100);
        expect(p.influence).toBeGreaterThanOrEqual(0);
        expect(p.influence).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("director mode — privacy", () => {
  it("only the hot-seat player is excluded from rating themselves", () => {
    let s = startGame(room(6)).state;
    let guard = 0;
    let checked = false;
    while (s.phase !== "FINAL_RESULTS" && guard++ < 600) {
      const round = currentRound(s);
      if (s.phase === "ANSWERING" && round?.kind === "interrogation" && round.hotSeatId && !checked) {
        checked = true;
        const hot = projectView(s, round.hotSeatId);
        expect(hot.round?.iAmHotSeat).toBe(true);
        expect(hot.round?.myOptions.length).toBe(0);
        const otherId = s.players.map((p) => p.id).find((id) => id !== round.hotSeatId)!;
        const other = projectView(s, otherId);
        expect(other.round?.myOptions.length).toBe(5); // 1..5 rating
      }
      if (s.phase === "ANSWERING" && round) {
        for (const id of respondents(round)) {
          const opts = optionsForPlayer(round, id);
          if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
        }
      }
      s = advance(s);
    }
    expect(checked).toBe(true);
  });

  it("a secret deal's task is only visible to the two dealmakers", () => {
    let s = startGame(room(7, 5)).state;
    let guard = 0;
    let checked = false;
    while (s.phase !== "FINAL_RESULTS" && guard++ < 600) {
      const round = currentRound(s);
      if (s.phase === "ANSWERING" && round?.kind === "deal" && round.secretDeal && !checked) {
        checked = true;
        const [a, b] = round.secretDeal.players;
        expect(projectView(s, a).round?.mySecretDeal).toBeDefined();
        expect(projectView(s, b).round?.mySecretDeal).toBeDefined();
        const outsider = s.players.map((p) => p.id).find((id) => id !== a && id !== b)!;
        expect(projectView(s, outsider).round?.mySecretDeal).toBeUndefined();
        // the blob for the outsider must not leak the task text
        const blob = JSON.stringify(projectView(s, outsider));
        expect(blob).not.toContain(round.secretDeal.task.en);
      }
      if (s.phase === "ANSWERING" && round) {
        for (const id of respondents(round)) {
          const opts = optionsForPlayer(round, id);
          if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
        }
      }
      s = advance(s);
    }
    expect(checked).toBe(true);
  });

  it("the stage view (no viewer) never exposes a secret deal or mission", () => {
    const final = playthrough(startGame(room(6, 9)).state);
    const stage = projectView(final, null, { stage: true });
    const blob = JSON.stringify(stage);
    expect(blob).not.toContain('"mySecretDeal"');
    for (const m of final.missions) {
      expect(blob).not.toContain(m.missionId);
    }
  });
});

describe("director mode — classic mode is unaffected", () => {
  it("classic games have no director log and no talk phases", () => {
    let s = createGame("CLS1", { id: "h", nickname: "H", lang: "en" }, "classic");
    for (let i = 1; i < 5; i++) s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "en" }).state;
    const final = playthrough(startGame(s).state);
    expect(final.directorLog).toHaveLength(0);
    expect(final.rounds.every((r) => !r.talkSeconds)).toBe(true);
  });
});
