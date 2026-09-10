import {
  DIMENSIONS,
  type BehaviorProfile,
  type BehaviorTags,
  type Dimension,
  type DimensionState,
  type Trend,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Deterministic / statistical behavior model.
//
// This is NOT an LLM guessing a personality. Every number here
// comes from a concrete choice a player made against a question
// whose options carry known behavioral signals.
// ─────────────────────────────────────────────────────────────

const HISTORY_CAP = 12;

export function emptyDimension(): DimensionState {
  return { value: 0.5, confidence: 0, evidenceCount: 0, trend: "stable", history: [] };
}

export function emptyProfile(): BehaviorProfile {
  const p = {} as BehaviorProfile;
  for (const d of DIMENSIONS) p[d] = emptyDimension();
  return p;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function computeTrend(history: number[]): Trend {
  if (history.length < 4) return "stable";
  const window = Math.min(6, history.length);
  const half = Math.floor(window / 2);
  const recent = history.slice(-half);
  const prev = history.slice(-window, -half);
  const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const pAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
  const delta = rAvg - pAvg;
  if (delta > 0.1) return "rising";
  if (delta < -0.1) return "falling";
  return "stable";
}

/**
 * Apply one observed choice to a profile.
 * `tags` maps dimensions to a signal in [-1, 1]; we translate that
 * to an observation in [0, 1] and do an EWMA update whose learning
 * rate decays as evidence accumulates (so early rounds move fast,
 * later rounds are sticky — which is also why a *sustained* change
 * of behavior still eventually flips the profile).
 */
export function applyChoice(profile: BehaviorProfile, tags: BehaviorTags): BehaviorProfile {
  const next: BehaviorProfile = { ...profile };
  for (const key of Object.keys(tags) as Dimension[]) {
    const signal = tags[key];
    if (signal === undefined || signal === 0) continue;
    const prev = profile[key] ?? emptyDimension();
    const obs = clamp01(0.5 + 0.5 * Math.max(-1, Math.min(1, signal)));

    const n = prev.evidenceCount;
    // learning rate: 0.5 at first evidence -> ~0.15 asymptote
    const lr = 0.15 + 0.35 / (1 + n * 0.6);
    const value = clamp01(prev.value * (1 - lr) + obs * lr);

    const history = [...prev.history, obs].slice(-HISTORY_CAP);
    const evidenceCount = n + 1;

    // confidence grows with evidence, shrinks with observation spread
    const coverage = evidenceCount / (evidenceCount + 3);
    const spread = stdev(history); // 0..~0.5
    const confidence = clamp01(coverage * (1 - Math.min(1, spread * 1.6)));

    next[key] = { value, confidence, evidenceCount, trend: computeTrend(history), history };
  }
  return next;
}

// ---------- Read helpers used by the theory engine & AI layer ----------

export interface DimensionReading {
  dimension: Dimension;
  value: number;
  confidence: number;
  evidenceCount: number;
  trend: Trend;
  /** signed strength: -1 (strongly low) .. +1 (strongly high) */
  polarity: number;
}

export function topReadings(
  profile: BehaviorProfile,
  opts: { minConfidence?: number; minEvidence?: number; limit?: number } = {},
): DimensionReading[] {
  const { minConfidence = 0.35, minEvidence = 2, limit = 3 } = opts;
  const readings: DimensionReading[] = [];
  for (const d of DIMENSIONS) {
    const s = profile[d];
    if (s.confidence < minConfidence || s.evidenceCount < minEvidence) continue;
    const polarity = (s.value - 0.5) * 2;
    if (Math.abs(polarity) < 0.25) continue;
    readings.push({
      dimension: d,
      value: s.value,
      confidence: s.confidence,
      evidenceCount: s.evidenceCount,
      trend: s.trend,
      polarity,
    });
  }
  readings.sort(
    (a, b) => Math.abs(b.polarity) * b.confidence - Math.abs(a.polarity) * a.confidence,
  );
  return readings.slice(0, limit);
}

/** Dimensions with the weakest evidence — the selector steers rounds toward these. */
export function underexploredDimensions(profiles: BehaviorProfile[]): Dimension[] {
  const totals = new Map<Dimension, number>();
  for (const d of DIMENSIONS) totals.set(d, 0);
  for (const p of profiles) {
    for (const d of DIMENSIONS) {
      totals.set(d, (totals.get(d) ?? 0) + p[d].evidenceCount);
    }
  }
  return [...totals.entries()].sort((a, b) => a[1] - b[1]).map(([d]) => d);
}
