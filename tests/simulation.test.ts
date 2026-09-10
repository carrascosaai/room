import { describe, expect, it } from "vitest";
import { runSimulatedGame, standardCast } from "@/game/sim";
import { topReadings } from "@/game/behavior";

describe("simulation — the AI actually learns", () => {
  it("distinguishes a high-risk player from a low-risk player", () => {
    let sep = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const { state } = runSimulatedGame(standardCast(), { seed: 500 + i, missionAware: false });
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

  it("runs a theory: creates it from evidence, tests it, resolves it", () => {
    let created = 0;
    let resolved = 0;
    for (let i = 0; i < 20; i++) {
      const { theories } = runSimulatedGame(standardCast(), { seed: 900 + i });
      created += theories.length;
      resolved += theories.filter((t) => t.status === "strengthened" || t.status === "discarded").length;
    }
    expect(created).toBeGreaterThan(0);
    expect(resolved).toBeGreaterThan(0);
  });

  it("every simulated game reaches FINAL_RESULTS with a full report", () => {
    for (let i = 0; i < 15; i++) {
      const { state } = runSimulatedGame(standardCast(), { seed: 1 + i });
      expect(state.phase).toBe("FINAL_RESULTS");
      expect(state.report).toBeDefined();
      expect(state.report!.aiAccuracy).toBeGreaterThanOrEqual(0);
      expect(state.report!.aiAccuracy).toBeLessThanOrEqual(1);
    }
  });

  it("stays quiet rather than wrong: a weak group produces no over-confident theories", () => {
    // all-average bots => little to learn
    const flat = standardCast().map((b) => ({ ...b, traits: {}, favourite: undefined }));
    const { state } = runSimulatedGame(flat, { seed: 3 });
    for (const t of state.theories) {
      if (t.status === "strengthened") continue;
      expect(t.confidence).toBeLessThan(0.95);
    }
    // no player should have a >0.9 confidence extreme reading from noise alone
    for (const p of state.players) {
      const r = topReadings(state.behavior[p.id]!, { minConfidence: 0.9, minEvidence: 2, limit: 1 });
      expect(r.length).toBe(0);
    }
  });
});
