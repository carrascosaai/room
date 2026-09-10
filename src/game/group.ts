import type { GroupModel, RelationEdge } from "./types";

// ─────────────────────────────────────────────────────────────
// Group / relationship model. Tracks how each ordered pair of
// players behaves toward each other. Pure data + deterministic
// updates — feeds the theory engine and the final report.
// ─────────────────────────────────────────────────────────────

export function emptyGroupModel(): GroupModel {
  return { edges: {}, voteConcentration: {} };
}

function key(from: string, to: string): string {
  return `${from}>${to}`;
}

export function emptyEdge(from: string, to: string): RelationEdge {
  return {
    from,
    to,
    selectedCount: 0,
    protectedCount: 0,
    cooperatedCount: 0,
    betrayedCount: 0,
    alignedCount: 0,
    comparableCount: 0,
    predictedCorrect: 0,
    predictedTotal: 0,
  };
}

export function getEdge(g: GroupModel, from: string, to: string): RelationEdge {
  return g.edges[key(from, to)] ?? emptyEdge(from, to);
}

function withEdge(g: GroupModel, e: RelationEdge): GroupModel {
  return { ...g, edges: { ...g.edges, [key(e.from, e.to)]: e } };
}

export function recordSelection(g: GroupModel, from: string, to: string): GroupModel {
  const e = getEdge(g, from, to);
  return withEdge(g, { ...e, selectedCount: e.selectedCount + 1 });
}

export function recordProtection(g: GroupModel, from: string, to: string): GroupModel {
  const e = getEdge(g, from, to);
  return withEdge(g, { ...e, protectedCount: e.protectedCount + 1, selectedCount: e.selectedCount + 1 });
}

export function recordDilemma(
  g: GroupModel,
  a: string,
  b: string,
  aCooperated: boolean,
  bCooperated: boolean,
): GroupModel {
  let next = g;
  const ea = getEdge(next, a, b);
  next = withEdge(next, {
    ...ea,
    cooperatedCount: ea.cooperatedCount + (aCooperated && bCooperated ? 1 : 0),
    betrayedCount: ea.betrayedCount + (!aCooperated ? 1 : 0),
  });
  const eb = getEdge(next, b, a);
  next = withEdge(next, {
    ...eb,
    cooperatedCount: eb.cooperatedCount + (aCooperated && bCooperated ? 1 : 0),
    betrayedCount: eb.betrayedCount + (!bCooperated ? 1 : 0),
  });
  return next;
}

/** Record that two players had a comparable choice and whether they matched. */
export function recordAlignment(
  g: GroupModel,
  a: string,
  b: string,
  matched: boolean,
): GroupModel {
  let next = g;
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    const e = getEdge(next, from, to);
    next = withEdge(next, {
      ...e,
      comparableCount: e.comparableCount + 1,
      alignedCount: e.alignedCount + (matched ? 1 : 0),
    });
  }
  return next;
}

export function recordPrediction(
  g: GroupModel,
  predictor: string,
  target: string,
  correct: boolean,
): GroupModel {
  const e = getEdge(g, predictor, target);
  return withEdge(g, {
    ...e,
    predictedTotal: e.predictedTotal + 1,
    predictedCorrect: e.predictedCorrect + (correct ? 1 : 0),
  });
}

export function setVoteConcentration(g: GroupModel, roundId: string, value: number): GroupModel {
  return { ...g, voteConcentration: { ...g.voteConcentration, [roundId]: value } };
}

// ---------- Derived metrics ----------

export interface PairMetric {
  a: string;
  b: string;
  mutualSelection: number;
  alignmentRatio: number; // 0..1
  comparable: number;
  cooperation: number;
  betrayal: number;
  oneWayLoyalty: number; // a->b selections minus b->a
}

export function pairMetrics(g: GroupModel, players: string[]): PairMetric[] {
  const out: PairMetric[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i]!;
      const b = players[j]!;
      const ab = getEdge(g, a, b);
      const ba = getEdge(g, b, a);
      const comparable = ab.comparableCount;
      out.push({
        a,
        b,
        mutualSelection: Math.min(ab.selectedCount, ba.selectedCount),
        alignmentRatio: comparable > 0 ? ab.alignedCount / comparable : 0,
        comparable,
        cooperation: ab.cooperatedCount,
        betrayal: ab.betrayedCount + ba.betrayedCount,
        oneWayLoyalty: ab.selectedCount - ba.selectedCount,
      });
    }
  }
  return out;
}

/** vote concentration for a single round's tally: 0 spread .. 1 unanimous */
export function concentration(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const max = Math.max(...counts);
  const share = max / total;
  // normalize so an even split ~= 0
  const evenShare = 1 / counts.length;
  return Math.max(0, (share - evenShare) / (1 - evenShare));
}
