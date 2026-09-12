import {
  HYPOTHESIS_TEMPLATES,
  counterCandidates,
  templateById,
  templatesForCategory,
  type HypothesisTemplate,
} from "./hypothesisContent";
import {
  COMPARISON_TEST_TEMPLATES,
  STAKES_POINTS,
  TEST_TEMPLATES,
  templatesForDimension,
  type Stakes,
} from "./testContent";
import { hashString, pick, shuffle } from "@/lib/rng";
import type {
  GameState,
  Hypothesis,
  HypothesisCategory,
  Player,
  TheoryTest,
} from "./types";

// ─────────────────────────────────────────────────────────────
// The hypothesis engine. A player authors a claim about another
// player; the engine builds a test that discriminates between
// "true" and "false"; confidence moves deterministically based on
// whether the target's real decision matched the claim.
//
// The LLM is never in this loop — every number here is computed
// from the template bank + the target's actual choice.
// ─────────────────────────────────────────────────────────────

const INITIAL_CONFIDENCE = 35;

function name(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? "?";
}

export function pickAuthor(state: GameState): string | null {
  const connected = state.players.filter((p) => p.connected);
  if (connected.length < 3) return null;
  const sorted = [...connected].sort((a, b) => a.authorCount - b.authorCount || a.joinedAt - b.joinedAt);
  return sorted[0]!.id;
}

/** A reasonable target for an auto-filled hypothesis: whoever has the
 *  most behavioral evidence gathered so far (so the test actually means
 *  something), excluding the author. */
export function pickAutoTarget(state: GameState, authorId: string): string | null {
  const candidates = state.players.filter((p) => p.connected && p.id !== authorId);
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestScore = -1;
  for (const p of candidates) {
    const prof = state.behavior[p.id];
    const evidence = prof ? Object.values(prof).reduce((a, d) => a + d.evidenceCount, 0) : 0;
    if (evidence > bestScore) {
      bestScore = evidence;
      best = p;
    }
  }
  return best.id;
}

export function pickAutoTemplate(
  state: GameState,
  targetId: string,
  rand: () => number,
): HypothesisTemplate {
  // prefer a dimension with real evidence so the statement feels earned
  const prof = state.behavior[targetId];
  const withEvidence = HYPOTHESIS_TEMPLATES.filter((t) => {
    const d = prof?.[t.dimension];
    return d && d.evidenceCount >= 2 && !t.needsComparison;
  });
  const pool = withEvidence.length > 0 ? withEvidence : HYPOTHESIS_TEMPLATES.filter((t) => !t.needsComparison);
  return pick(rand, pool);
}

export function activeHypothesesOn(state: GameState, targetId: string, dimension: string): Hypothesis[] {
  return state.hypotheses.filter(
    (h) => h.targetId === targetId && h.dimension === dimension && h.status === "active",
  );
}

/** Has this exact target+dimension+direction already been claimed and not yet resolved? */
export function alreadyHypothesized(state: GameState, targetId: string, templateId: string): boolean {
  const t = templateById(templateId);
  if (!t) return false;
  return state.hypotheses.some(
    (h) => h.targetId === targetId && h.dimension === t.dimension && h.direction === t.direction && h.status === "active",
  );
}

export function buildHypothesis(
  state: GameState,
  input: {
    creatorId: string;
    targetId: string;
    templateId: string;
    anonymous: boolean;
    counterOf?: string;
    autoFilled?: boolean;
  },
  createdRound: number,
  rand: () => number,
): Hypothesis {
  const template = templateById(input.templateId)!;
  const comparisonTargetId = template.needsComparison
    ? pickComparisonTarget(state, input.targetId, rand)
    : undefined;
  const id = "h_" + hashString(input.creatorId + input.targetId + input.templateId + createdRound + state.seed).toString(36);
  return {
    id,
    creatorId: input.creatorId,
    targetId: input.targetId,
    category: template.category,
    dimension: template.dimension,
    direction: template.direction,
    comparisonTargetId,
    templateId: template.id,
    statement: template.statement(name(state.players, input.targetId), comparisonTargetId ? name(state.players, comparisonTargetId) : undefined),
    anonymous: input.anonymous,
    revealed: false,
    confidence: INITIAL_CONFIDENCE,
    initialConfidence: INITIAL_CONFIDENCE,
    evidenceCount: 0,
    supportingEvidence: 0,
    contradictingEvidence: 0,
    status: "active",
    counterOf: input.counterOf,
    autoFilled: input.autoFilled ?? false,
    createdRound,
  };
}

function pickComparisonTarget(state: GameState, targetId: string, rand: () => number): string | undefined {
  const others = state.players.filter((p) => p.id !== targetId).map((p) => p.id);
  if (others.length === 0) return undefined;
  return shuffle(rand, others)[0];
}

export function categoriesAvailable(): HypothesisCategory[] {
  return ["loyalty", "trust", "money", "social", "competition", "relationships", "spicy"];
}

export function templateOptionsFor(category: HypothesisCategory) {
  return templatesForCategory(category);
}

export function counterOptionsFor(hypothesis: Hypothesis) {
  const original = templateById(hypothesis.templateId);
  if (!original) return [];
  return counterCandidates(original);
}

// ---------- building the test ----------

export function buildTest(
  state: GameState,
  hypothesis: Hypothesis,
  counter: Hypothesis | null,
  stakes: Stakes,
  rand: () => number,
): TheoryTest {
  const targetName = name(state.players, hypothesis.targetId);

  if (hypothesis.comparisonTargetId) {
    const others = state.players
      .map((p) => p.id)
      .filter((id) => id !== hypothesis.targetId && id !== hypothesis.comparisonTargetId);
    const rival = others.length > 0 ? pick(rand, others) : hypothesis.comparisonTargetId;
    const pool = COMPARISON_TEST_TEMPLATES.filter((t) => !state.usedTestTemplateIds.includes(t.id));
    const usable = pool.length > 0 ? pool : COMPARISON_TEST_TEMPLATES;
    const template = pick(rand, usable);
    return {
      id: "tt_" + hashString(hypothesis.id + template.id + stakes).toString(36),
      hypothesisIds: counter ? [hypothesis.id, counter.id] : [hypothesis.id],
      targetId: hypothesis.targetId,
      dimension: hypothesis.dimension,
      stakes,
      templateId: template.id,
      scenario: template.scenario(targetName),
      comparisonOptions: [hypothesis.comparisonTargetId, rival],
      optionA: { label: { en: "", es: "" }, confirmsHigh: true },
      optionB: { label: { en: "", es: "" }, confirmsHigh: false },
    };
  }

  const byDimension = templatesForDimension(hypothesis.dimension);
  const pool = byDimension.filter((t) => !state.usedTestTemplateIds.includes(t.id));
  // defensive: every dimension should have at least one template, but never
  // crash the game over a content gap — fall back to the full bank
  const usable = pool.length > 0 ? pool : byDimension.length > 0 ? byDimension : TEST_TEMPLATES;
  const template = pick(rand, usable);
  const optA = template.optionA(stakes);
  const optB = template.optionB(stakes);
  return {
    id: "tt_" + hashString(hypothesis.id + template.id + stakes).toString(36),
    hypothesisIds: counter ? [hypothesis.id, counter.id] : [hypothesis.id],
    targetId: hypothesis.targetId,
    dimension: hypothesis.dimension,
    stakes,
    templateId: template.id,
    scenario: template.scenario(targetName, stakes),
    optionA: optA,
    optionB: optB,
  };
}

// ---------- resolution ----------

/** Did the target's decision confirm the HIGH reading of the test's dimension? */
export function decisionConfirmsHigh(test: TheoryTest, decision: string): boolean | null {
  if (test.comparisonOptions) {
    if (decision === test.comparisonOptions[0]) return true; // picked the named comparison target -> "high" (prefers them)
    if (decision === test.comparisonOptions[1]) return false;
    return null;
  }
  if (decision === "A") return test.optionA.confirmsHigh;
  if (decision === "B") return test.optionB.confirmsHigh;
  return null;
}

export interface ConfidenceResult {
  confidence: number;
  status: "active" | "confirmed" | "discarded";
  held: boolean;
  delta: number;
  supportingEvidence: number;
  contradictingEvidence: number;
}

const STAKES_FACTOR: Record<Stakes, number> = { low: 0.6, medium: 1.0, high: 1.5 };

/** The confidence formula. Starts at 35, moves with diminishing returns on
 *  repeated confirmation, and takes a sharper hit on contradiction —
 *  especially if the hypothesis had built up a lot of confidence already. */
export function updateConfidence(hypothesis: Hypothesis, confirmedHigh: boolean, stakes: Stakes): ConfidenceResult {
  const held = confirmedHigh === (hypothesis.direction === "high");
  const stakesFactor = STAKES_FACTOR[stakes];
  const evidenceFactor = 1 / (1 + hypothesis.evidenceCount * 0.15);

  let delta: number;
  if (held) {
    delta = 12 * stakesFactor * Math.max(0.4, evidenceFactor);
  } else {
    delta = -18 * stakesFactor * (1 + (1 - evidenceFactor) * 0.5);
  }

  const confidence = Math.max(5, Math.min(97, Math.round(hypothesis.confidence + delta)));
  const status: ConfidenceResult["status"] = confidence >= 75 ? "confirmed" : confidence <= 15 ? "discarded" : "active";

  return {
    confidence,
    status,
    held,
    delta: Math.round(delta),
    supportingEvidence: hypothesis.supportingEvidence + (held ? 1 : 0),
    contradictingEvidence: hypothesis.contradictingEvidence + (held ? 0 : 1),
  };
}

export const STAKES_LABELS: Stakes[] = ["low", "medium", "high"];
export { STAKES_POINTS };
export type { Stakes };
