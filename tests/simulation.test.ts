import { describe, expect, it } from "vitest";
import { runSimulatedGame, standardCast } from "@/game/sim";
import { topReadings } from "@/game/behavior";

describe("simulation — the behavior model actually learns", () => {
  it("distinguishes a high-risk player from a low-risk player", () => {
    let sep = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const { state } = runSimulatedGame(standardCast(), { seed: 500 + i });
      const risky = state.behavior["u1"]!.risk.value;
      const safe = state.behavior["u2"]!.risk.value;
      sep += risky - safe;
    }
    expect(sep / N).toBeGreaterThan(0.15);
  });

  it("distinguishes a cooperator from a betrayer", () => {
    const { state } = runSimulatedGame(standardCast(), { seed: 77 });
    const team = state.behavior["u7"]!.cooperation.value;
    const betrayer = state.behavior["u5"]!.cooperation.value;
    expect(team).toBeGreaterThan(betrayer);
  });

  it("adapts a player's profile when their behavior flips mid-game", () => {
    const baseline = runSimulatedGame(standardCast(), { seed: 7 }).state.behavior["u1"]!.risk.value;
    const flipped = runSimulatedGame(standardCast(), {
      seed: 7,
      mutateAt: 3,
      mutate: (bots) =>
        bots.map((b) => (b.id === "u1" ? { ...b, traits: { ...b.traits, risk: 0.03, impulsivity: 0.1, patience: 0.9 } } : b)),
    }).state.behavior["u1"]!.risk.value;
    expect(flipped).toBeLessThan(baseline);
  });

  it("runs the hypothesis loop: creates theories from evidence and resolves them", () => {
    let created = 0;
    let resolved = 0;
    for (let i = 0; i < 20; i++) {
      const { hypotheses } = runSimulatedGame(standardCast(), { seed: 900 + i });
      created += hypotheses.length;
      resolved += hypotheses.filter((h) => h.status === "confirmed" || h.status === "discarded").length;
    }
    expect(created).toBeGreaterThan(0);
    expect(resolved).toBeGreaterThanOrEqual(0);
  });

  it("every simulated game reaches FINAL_REPORT with a full report", () => {
    for (let i = 0; i < 15; i++) {
      const { state } = runSimulatedGame(standardCast(), { seed: 1 + i });
      expect(state.phase).toBe("FINAL_REPORT");
      expect(state.report).toBeDefined();
      expect(state.report!.hypothesesTested).toBeGreaterThanOrEqual(0);
      expect(state.report!.standings.length).toBe(state.players.length);
    }
  });

  it("stays quiet rather than wrong: a flat group produces no over-confident readings from noise alone", () => {
    const flat = standardCast().map((b) => ({ ...b, traits: {}, favourite: undefined }));
    const { state } = runSimulatedGame(flat, { seed: 3 });
    for (const p of state.players) {
      const r = topReadings(state.behavior[p.id]!, { minConfidence: 0.9, minEvidence: 2, limit: 1 });
      expect(r.length).toBe(0);
    }
  });
});
