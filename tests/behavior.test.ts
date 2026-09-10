import { describe, expect, it } from "vitest";
import { applyChoice, emptyProfile, topReadings, underexploredDimensions } from "@/game/behavior";

describe("behavior model", () => {
  it("moves a dimension toward a consistent positive signal", () => {
    let p = emptyProfile();
    for (let i = 0; i < 6; i++) p = applyChoice(p, { risk: 0.8 });
    expect(p.risk.value).toBeGreaterThan(0.75);
    expect(p.risk.confidence).toBeGreaterThan(0.5);
    expect(p.risk.evidenceCount).toBe(6);
  });

  it("moves a dimension toward a consistent negative signal", () => {
    let p = emptyProfile();
    for (let i = 0; i < 6; i++) p = applyChoice(p, { risk: -0.8 });
    expect(p.risk.value).toBeLessThan(0.25);
  });

  it("keeps confidence low when the signal is noisy", () => {
    let p = emptyProfile();
    const seq = [0.9, -0.9, 0.9, -0.9, 0.9, -0.9];
    for (const s of seq) p = applyChoice(p, { risk: s });
    expect(p.risk.confidence).toBeLessThan(0.4);
  });

  it("adapts when behavior changes midway through", () => {
    let p = emptyProfile();
    for (let i = 0; i < 8; i++) p = applyChoice(p, { patience: 0.9 });
    const high = p.patience.value;
    expect(high).toBeGreaterThan(0.75);
    // mid-transition the trend should register as falling
    for (let i = 0; i < 4; i++) p = applyChoice(p, { patience: -0.9 });
    expect(p.patience.trend).toBe("falling");
    // and it keeps converging toward the new behavior
    for (let i = 0; i < 6; i++) p = applyChoice(p, { patience: -0.9 });
    expect(p.patience.value).toBeLessThan(high - 0.25);
  });

  it("reports the strongest readings first", () => {
    let p = emptyProfile();
    for (let i = 0; i < 5; i++) p = applyChoice(p, { risk: 0.9, greed: 0.3 });
    const readings = topReadings(p);
    expect(readings[0]?.dimension).toBe("risk");
  });

  it("identifies under-explored dimensions", () => {
    let p = emptyProfile();
    for (let i = 0; i < 5; i++) p = applyChoice(p, { risk: 0.5 });
    const under = underexploredDimensions([p]);
    expect(under[0]).not.toBe("risk");
    expect(under).toContain("loyalty");
  });
});
