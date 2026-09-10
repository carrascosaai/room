import { DIMENSIONS } from "./types";
import { getEdge } from "./group";
import type { BehaviorProfile, GameState } from "./types";

// ─────────────────────────────────────────────────────────────
// Compatibility ("chemistry") between two players. Deterministic,
// derived from real choices:
//   - do their behavior profiles look alike?
//   - do they keep landing on the same answer?
//   - do they pick each other?
//   - did they match on taste / values probes?
//
// This is the engine's basis for the "AFINIDAD DETECTADA" moment
// and the "most compatible pair" result. It is a statement about
// CHOICES, never about feelings.
// ─────────────────────────────────────────────────────────────

/** 0 (opposite) .. 1 (identical) similarity of two behavior profiles. */
export function profileSimilarity(a: BehaviorProfile, b: BehaviorProfile): number {
  let weighted = 0;
  let weight = 0;
  for (const d of DIMENSIONS) {
    const da = a[d];
    const db = b[d];
    const conf = Math.min(da.confidence, db.confidence);
    if (conf < 0.2 || da.evidenceCount < 2 || db.evidenceCount < 2) continue;
    const diff = Math.abs(da.value - db.value); // 0..1
    weighted += (1 - diff) * conf;
    weight += conf;
  }
  if (weight === 0) return 0.5;
  return weighted / weight;
}

export interface CompatScore {
  a: string;
  b: string;
  score: number; // 0..1
  similarity: number;
  alignmentRatio: number;
  tasteMatches: number;
  mutualSelection: number;
  comparable: number;
  /** enough data to say anything at all */
  grounded: boolean;
}

export function compatibility(state: GameState, a: string, b: string): CompatScore {
  const pa = state.behavior[a];
  const pb = state.behavior[b];
  const ab = getEdge(state.group, a, b);
  const ba = getEdge(state.group, b, a);
  const comparable = ab.comparableCount;
  const alignmentRatio = comparable > 0 ? ab.alignedCount / comparable : 0.5;
  const similarity = pa && pb ? profileSimilarity(pa, pb) : 0.5;
  const tasteMatches = ab.matchedTasteCount;
  const mutualSelection = Math.min(ab.selectedCount, ba.selectedCount);

  const score =
    0.34 * similarity +
    0.34 * alignmentRatio +
    0.2 * Math.min(1, tasteMatches / 2) +
    0.12 * Math.min(1, mutualSelection / 2);

  return {
    a,
    b,
    score,
    similarity,
    alignmentRatio,
    tasteMatches,
    mutualSelection,
    comparable,
    grounded: comparable >= 3 || tasteMatches >= 1,
  };
}

export function allCompatibility(state: GameState): CompatScore[] {
  const ids = state.players.map((p) => p.id);
  const out: CompatScore[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      out.push(compatibility(state, ids[i]!, ids[j]!));
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

/** The pair that clashes most on values (mirror image of compatibility). */
export function biggestClash(state: GameState): CompatScore | null {
  const all = allCompatibility(state).filter((c) => c.grounded);
  if (all.length === 0) return null;
  return all[all.length - 1] ?? null;
}

/** The player whose choices are hardest to line up with anyone else's. */
export function wildcardPlayer(state: GameState): { id: string; score: number } | null {
  const ids = state.players.map((p) => p.id);
  if (ids.length < 3) return null;
  let worst: { id: string; score: number } | null = null;
  for (const id of ids) {
    const scores = allCompatibility(state)
      .filter((c) => c.a === id || c.b === id)
      .filter((c) => c.comparable >= 2)
      .map((c) => c.score);
    if (scores.length < 2) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const prof = state.behavior[id];
    const consistency = prof?.consistency.value ?? 0.5;
    // a wildcard is UNPREDICTABLE — low internal consistency matters most;
    // being a mild outlier on compatibility is secondary.
    const wild = (1 - consistency) * 0.65 + (1 - avg) * 0.35;
    if (!worst || wild > worst.score) worst = { id, score: wild };
  }
  // only call someone a wildcard if there's real signal
  return worst && worst.score >= 0.42 ? worst : null;
}
