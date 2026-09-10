import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advance,
  createGame,
  currentRound,
  optionsForPlayer,
  reconcilePresence,
  removePlayer,
  respondents,
  setConnected,
  startGame,
  submitAnswer,
} from "@/game/engine";
import { projectView } from "@/game/view";
import type { GameState, Lang } from "@/game/types";

function seedRoom(n: number): GameState {
  let s = createGame("TEST", { id: "host", nickname: "Host", lang: "en" });
  for (let i = 1; i < n; i++) {
    s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "en" }).state;
  }
  return s;
}

/** drive a full game with every bot always picking the first option they can */
function playthrough(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== "FINAL_RESULTS" && guard++ < 300) {
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

describe("engine — lobby", () => {
  it("creates a room with the host", () => {
    const s = createGame("ABCD", { id: "h", nickname: "H", lang: "en" });
    expect(s.phase).toBe("LOBBY");
    expect(s.players).toHaveLength(1);
    expect(s.players[0]!.isHost).toBe(true);
    expect(s.hostId).toBe("h");
  });

  it("rejects duplicate nicknames", () => {
    let s = createGame("ABCD", { id: "h", nickname: "Sam", lang: "en" });
    const res = addPlayer(s, { id: "x", nickname: "sam", lang: "en" });
    expect(res.error).toBe("nickname_taken");
  });

  it("rejects the 11th player", () => {
    let s = seedRoom(10);
    const res = addPlayer(s, { id: "over", nickname: "Over", lang: "en" });
    expect(res.error).toBe("room_full");
  });

  it("re-joining with the same id just reconnects", () => {
    let s = seedRoom(3);
    s = setConnected(s, "p1", false);
    const res = addPlayer(s, { id: "p1", nickname: "P1", lang: "en" });
    expect(res.error).toBeUndefined();
    expect(res.state.players.find((p) => p.id === "p1")!.connected).toBe(true);
  });

  it("won't start with fewer than 3 players", () => {
    const s = seedRoom(2);
    expect(startGame(s).error).toBe("not_enough_players");
  });

  it("transfers host when the host leaves", () => {
    let s = seedRoom(3);
    s = removePlayer(s, "host");
    expect(s.hostId).toBe("p1");
    expect(s.players.find((p) => p.id === "p1")!.isHost).toBe(true);
  });

  it("transfers host when the host disconnects past the grace period", () => {
    let s = seedRoom(3);
    s.players = s.players.map((p) =>
      p.id === "host" ? { ...p, connected: true, lastSeen: Date.now() - 120_000 } : p,
    );
    s = reconcilePresence(s);
    expect(s.hostId).not.toBe("host");
  });
});

describe("engine — gameplay", () => {
  it("starts into ROUND_INTRO with round 0 built and a behavior profile per player", () => {
    const { state } = startGame(seedRoom(4));
    expect(state.phase).toBe("ROUND_INTRO");
    expect(state.rounds).toHaveLength(1);
    expect(Object.keys(state.behavior)).toHaveLength(4);
  });

  it("does not accept answers outside ANSWERING", () => {
    const { state } = startGame(seedRoom(4));
    const res = submitAnswer(state, { playerId: "p1", optionId: "A" });
    expect(res.error).toBe("not_answering");
  });

  it("rejects a second answer from the same player", () => {
    let s = advance(startGame(seedRoom(4)).state); // -> ANSWERING
    const round = currentRound(s)!;
    const opt = optionsForPlayer(round, "p1")[0]!.id;
    s = submitAnswer(s, { playerId: "p1", optionId: opt }).state;
    const res = submitAnswer(s, { playerId: "p1", optionId: opt });
    expect(res.error).toBe("already_answered");
  });

  it("rejects an invalid option", () => {
    const s = advance(startGame(seedRoom(4)).state);
    const res = submitAnswer(s, { playerId: "p1", optionId: "NOT_AN_OPTION" });
    expect(res.error).toBe("invalid_option");
  });

  it("auto-reveals once everyone has answered", () => {
    let s = advance(startGame(seedRoom(4)).state);
    const round = currentRound(s)!;
    for (const id of respondents(round)) {
      s = submitAnswer(s, { playerId: id, optionId: optionsForPlayer(round, id)[0]!.id }).state;
    }
    s = advance(s);
    expect(s.phase).toBe("REVEAL");
    expect(s.outcomes).toHaveLength(1);
  });

  it("plays a full game end to end and produces a report", () => {
    const final = playthrough(startGame(seedRoom(5)).state);
    expect(final.phase).toBe("FINAL_RESULTS");
    expect(final.report).toBeDefined();
    expect(final.report!.standings).toHaveLength(5);
    expect(final.rounds.length).toBeGreaterThanOrEqual(12);
    expect(final.aiMessages.length).toBeGreaterThanOrEqual(3);
    // scores are computed server-side and are non-negative sums of deltas
    for (const p of final.players) expect(p.score).toBeGreaterThan(0);
  });

  it("emits at least one AI observation and one theory across a full game", () => {
    const final = playthrough(startGame(seedRoom(6)).state);
    const kinds = new Set(final.aiMessages.map((m) => m.kind));
    expect(kinds.has("observation")).toBe(true);
    expect(final.aiMessages.some((m) => m.kind === "theory" || m.kind === "final")).toBe(true);
  });
});

describe("view projection — no hidden data leaks", () => {
  it("never exposes another player's answer during ANSWERING", () => {
    let s = advance(startGame(seedRoom(4)).state);
    const round = currentRound(s)!;
    s = submitAnswer(s, { playerId: "p1", optionId: optionsForPlayer(round, "p1")[0]!.id }).state;
    const view = projectView(s, "p2");
    expect(view.reveal).toBeUndefined();
    expect(view.round?.myOptions.length).toBeGreaterThan(0);
    // p2's view carries no record of p1's choice
    expect(JSON.stringify(view)).not.toContain('"optionId"');
  });

  it("never exposes behavioral tags or 'forming' theories", () => {
    const final = playthrough(startGame(seedRoom(5)).state);
    const view = projectView(final, "host");
    const blob = JSON.stringify(view);
    expect(blob).not.toContain('"tags"');
    expect(blob).not.toContain('"history"');
    for (const t of view.theories) expect(t.status).not.toBe("forming");
  });
});

describe("mixed-language rooms", () => {
  it("keeps both languages on every AI message", () => {
    const langs: Lang[] = ["es", "en", "es", "en", "es"];
    let s = createGame("MIX", { id: "host", nickname: "Host", lang: langs[0]! });
    for (let i = 1; i < langs.length; i++) {
      s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: langs[i]! }).state;
    }
    const final = playthrough(startGame(s).state);
    for (const m of final.aiMessages) {
      expect(m.text.en.length).toBeGreaterThan(0);
      expect(m.text.es.length).toBeGreaterThan(0);
    }
  });
});
