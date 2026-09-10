// ─────────────────────────────────────────────────────────────
// Scoring. All scoring is computed server-side from validated
// answers. The AI never assigns points.
// ─────────────────────────────────────────────────────────────

export const POINTS = {
  answered: 10, // participation, keeps everyone moving
  correctPrediction: 100,
  cooperateBoth: 50,
  successfulBetrayal: 100,
  betrayedWhileCooperating: 0,
  bothBetray: 20,
  predictAnotherPlayer: 75,
  foolAiHypothesis: 100, // your choice broke the AI's prediction about you
  winAiChallenge: 150,
  majorityBonus: 15,
  contrarianBonus: 25, // went against the room (small — being different isn't "wrong")
} as const;

export interface DilemmaResult {
  aId: string;
  bId: string;
  aCooperated: boolean;
  bCooperated: boolean;
}

/** Symmetric cooperate/betray payoff. */
export function scoreDilemma(r: DilemmaResult): Record<string, number> {
  const out: Record<string, number> = {};
  if (r.aCooperated && r.bCooperated) {
    out[r.aId] = POINTS.cooperateBoth;
    out[r.bId] = POINTS.cooperateBoth;
  } else if (!r.aCooperated && !r.bCooperated) {
    out[r.aId] = POINTS.bothBetray;
    out[r.bId] = POINTS.bothBetray;
  } else if (!r.aCooperated && r.bCooperated) {
    out[r.aId] = POINTS.successfulBetrayal;
    out[r.bId] = POINTS.betrayedWhileCooperating;
  } else {
    out[r.aId] = POINTS.betrayedWhileCooperating;
    out[r.bId] = POINTS.successfulBetrayal;
  }
  return out;
}

export function scoreMajorityMinority(
  answers: { playerId: string; optionId: string }[],
): { deltas: Record<string, number>; majorityOptionId: string | null; contrarians: string[] } {
  const tally = new Map<string, number>();
  for (const a of answers) tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
  let majorityOptionId: string | null = null;
  let max = -1;
  for (const [opt, count] of tally) {
    if (count > max) {
      max = count;
      majorityOptionId = opt;
    }
  }
  const deltas: Record<string, number> = {};
  const contrarians: string[] = [];
  const tied = [...tally.values()].filter((c) => c === max).length > 1;
  for (const a of answers) {
    if (!tied && a.optionId === majorityOptionId) {
      deltas[a.playerId] = POINTS.majorityBonus;
    } else if (!tied) {
      deltas[a.playerId] = POINTS.contrarianBonus;
      contrarians.push(a.playerId);
    } else {
      deltas[a.playerId] = 0;
    }
  }
  return { deltas, majorityOptionId: tied ? null : majorityOptionId, contrarians };
}

export function scorePrediction(correct: boolean): number {
  return correct ? POINTS.correctPrediction : 0;
}
