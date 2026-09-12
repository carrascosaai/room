/* eslint-disable no-console */
import { runSimulatedGame, standardCast } from "../src/game/sim";
import { topReadings } from "../src/game/behavior";
import type { Dimension } from "../src/game/types";

// Run: npm run simulate

function pctBar(v: number): string {
  const n = Math.round(v * 20);
  return "█".repeat(n) + "░".repeat(20 - n) + ` ${(v * 100).toFixed(0)}%`;
}

function main() {
  console.log("ROOM — simulation\n");

  const cast = standardCast();
  const { state, rounds, aiMessages, hypotheses } = runSimulatedGame(cast, { seed: 7 });

  console.log(`Rounds played: ${rounds}`);
  console.log(`AI messages:   ${aiMessages}`);
  console.log(`Hypotheses:    ${hypotheses.length} (${hypotheses.map((h) => `${h.category}:${h.status}@${h.confidence}%`).join(", ")})`);
  console.log(`Final phase:   ${state.phase}\n`);

  console.log("Behavior readings per bot (top dimension):");
  for (const p of state.players) {
    const prof = state.behavior[p.id];
    const r = prof ? topReadings(prof, { minConfidence: 0.2, minEvidence: 1, limit: 1 })[0] : undefined;
    const risk = prof?.risk;
    console.log(
      `  ${p.nickname.padEnd(9)} risk ${pctBar(risk?.value ?? 0.5)}   ${
        r ? `top:${r.dimension}(${(r.polarity > 0 ? "+" : "")}${r.polarity.toFixed(2)})` : "—"
      }`,
    );
  }

  // distinguishing check
  const risky = state.behavior["u1"]?.risk.value ?? 0.5;
  const safe = state.behavior["u2"]?.risk.value ?? 0.5;
  console.log(`\nRisk separation (Risky vs Safe): ${(risky - safe).toFixed(2)} ${risky - safe > 0.15 ? "PASS" : "WEAK"}`);

  // adaptation check
  const flip = runSimulatedGame(standardCast(), {
    seed: 7,
    mutateAt: 6,
    mutate: (bots) =>
      bots.map((b) => (b.id === "u1" ? { ...b, traits: { ...b.traits, risk: 0.05 } } : b)),
  });
  const riskAfterFlip = flip.state.behavior["u1"]?.risk.value ?? 0.5;
  console.log(
    `Adaptation: bot A risk after mid-game flip to cautious = ${riskAfterFlip.toFixed(2)} ${
      riskAfterFlip < risky ? "PASS (moved down)" : "no change"
    }`,
  );

  // report
  const rep = flip.state.report;
  if (rep) {
    console.log(`\nHypotheses tested: ${rep.hypothesesTested}, confirmed: ${rep.hypothesesConfirmed}`);
    console.log(`Final analysis (EN): ${rep.finalAnalysis.en}`);
  }

  // aggregate over many seeds
  let sepSum = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const s = runSimulatedGame(standardCast(), { seed: 1000 + i });
    const rr = s.state.behavior["u1"]?.risk.value ?? 0.5;
    const ss = s.state.behavior["u2"]?.risk.value ?? 0.5;
    sepSum += rr - ss;
  }
  const avg = sepSum / N;
  console.log(`\n${N} games — avg risk separation: ${avg.toFixed(3)}  ${avg > 0.15 ? "PASS" : "FAIL"}`);

  const dims: Dimension[] = ["conformity", "contrarianism", "cooperation", "competitiveness"];
  const s2 = runSimulatedGame(standardCast(), { seed: 42 });
  console.log("\nOther separations (single game):");
  for (const d of dims) {
    const vals = s2.state.players.map((p) => s2.state.behavior[p.id]?.[d].value ?? 0.5);
    const spread = Math.max(...vals) - Math.min(...vals);
    console.log(`  ${d.padEnd(16)} spread ${spread.toFixed(2)}`);
  }
}

main();
