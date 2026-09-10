import { topReadings } from "./behavior";
import { pairMetrics, getEdge } from "./group";
import type {
  BehaviorProfile,
  GroupModel,
  Player,
  Theory,
  TheoryType,
} from "./types";
import { hashString } from "@/lib/rng";

// ─────────────────────────────────────────────────────────────
// Theory engine.
//
// A theory is a *falsifiable* statement about observed behavior.
// It always states an OBSERVATION (what happened), never a claim
// about feelings, relationships, crime, health or sexuality.
// The engine proposes theories, the selector schedules a test,
// and the result deterministically moves the confidence.
// ─────────────────────────────────────────────────────────────

export interface TheoryCandidate {
  type: TheoryType;
  players: string[];
  evidenceCount: number;
  evidence: string;
  confidence: number;
  /** how strong / interesting this is — used to pick which to announce */
  salience: number;
  /** true = this is "salseo" (social), false = strategic */
  social: boolean;
}

function name(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? "?";
}

export function detectTheories(
  players: Player[],
  behavior: Record<string, BehaviorProfile>,
  group: GroupModel,
): TheoryCandidate[] {
  const ids = players.map((p) => p.id);
  const out: TheoryCandidate[] = [];

  // --- pair-based patterns ---
  for (const m of pairMetrics(group, ids)) {
    const A = name(players, m.a);
    const B = name(players, m.b);

    if (m.mutualSelection >= 2) {
      out.push({
        type: "mutual_bond",
        players: [m.a, m.b],
        evidenceCount: m.mutualSelection,
        evidence: `${A} and ${B} have chosen each other ${m.mutualSelection} times in selection rounds.`,
        confidence: Math.min(0.8, 0.4 + m.mutualSelection * 0.12),
        salience: 0.7 + m.mutualSelection * 0.1,
        social: true,
      });
    }

    if (m.comparable >= 4 && m.alignmentRatio >= 0.75) {
      out.push({
        type: "alliance",
        players: [m.a, m.b],
        evidenceCount: m.comparable,
        evidence: `${A} and ${B} made the same choice in ${Math.round(m.alignmentRatio * m.comparable)} of ${m.comparable} comparable rounds.`,
        confidence: Math.min(0.85, m.alignmentRatio),
        salience: 0.6 + m.alignmentRatio * 0.4,
        social: false,
      });
    }

    if (m.comparable >= 4 && m.alignmentRatio <= 0.25) {
      out.push({
        type: "rivalry",
        players: [m.a, m.b],
        evidenceCount: m.comparable,
        evidence: `${A} and ${B} disagreed in ${m.comparable - Math.round(m.alignmentRatio * m.comparable)} of ${m.comparable} comparable rounds.`,
        confidence: Math.min(0.8, 1 - m.alignmentRatio),
        salience: 0.55 + (1 - m.alignmentRatio) * 0.35,
        social: false,
      });
    }

    if (m.oneWayLoyalty >= 3) {
      const ab = getEdge(group, m.a, m.b);
      const ba = getEdge(group, m.b, m.a);
      out.push({
        type: "one_way_loyalty",
        players: [m.a, m.b],
        evidenceCount: m.oneWayLoyalty,
        evidence: `${A} has chosen ${B} ${ab.selectedCount} times; ${B} has chosen ${A} ${ba.selectedCount} times.`,
        confidence: Math.min(0.75, 0.35 + m.oneWayLoyalty * 0.12),
        salience: 0.6 + m.oneWayLoyalty * 0.08,
        social: true,
      });
    }

    // prediction link
    const pe = getEdge(group, m.a, m.b);
    if (pe.predictedTotal >= 3 && pe.predictedCorrect / pe.predictedTotal >= 0.75) {
      out.push({
        type: "prediction_link",
        players: [m.a, m.b],
        evidenceCount: pe.predictedTotal,
        evidence: `${A} correctly predicted ${B} in ${pe.predictedCorrect} of ${pe.predictedTotal} attempts.`,
        confidence: pe.predictedCorrect / pe.predictedTotal,
        salience: 0.5 + (pe.predictedCorrect / pe.predictedTotal) * 0.3,
        social: false,
      });
    }
  }

  // --- individual patterns ---
  for (const p of players) {
    const prof = behavior[p.id];
    if (!prof) continue;
    const readings = topReadings(prof, { minConfidence: 0.45, minEvidence: 3, limit: 2 });
    for (const r of readings) {
      if (r.dimension === "risk" && r.polarity >= 0.4) {
        out.push({
          type: "risk_seeker",
          players: [p.id],
          evidenceCount: r.evidenceCount,
          evidence: `${p.nickname} chose the higher-risk option in most rounds where risk was in play (${r.evidenceCount} data points).`,
          confidence: r.confidence,
          salience: 0.5 + r.confidence * 0.3,
          social: false,
        });
      }
      if (r.dimension === "risk" && r.polarity <= -0.4) {
        out.push({
          type: "risk_averse",
          players: [p.id],
          evidenceCount: r.evidenceCount,
          evidence: `${p.nickname} chose the safer option in most rounds where risk was in play (${r.evidenceCount} data points).`,
          confidence: r.confidence,
          salience: 0.45 + r.confidence * 0.3,
          social: false,
        });
      }
      if (r.dimension === "conformity" && r.polarity >= 0.4) {
        out.push({
          type: "conformist",
          players: [p.id],
          evidenceCount: r.evidenceCount,
          evidence: `${p.nickname} has sided with the apparent majority in ${r.evidenceCount} tracked rounds.`,
          confidence: r.confidence,
          salience: 0.55 + r.confidence * 0.35,
          social: false,
        });
      }
      if (r.dimension === "contrarianism" && r.polarity >= 0.4) {
        out.push({
          type: "contrarian",
          players: [p.id],
          evidenceCount: r.evidenceCount,
          evidence: `${p.nickname} has gone against the apparent majority in ${r.evidenceCount} tracked rounds.`,
          confidence: r.confidence,
          salience: 0.55 + r.confidence * 0.35,
          social: false,
        });
      }
    }
  }

  return out;
}

export function candidateToTheory(c: TheoryCandidate, createdRound: number): Theory {
  const id = "t_" + hashString(c.type + c.players.join("-") + createdRound).toString(36);
  return {
    id,
    type: c.type,
    players: c.players,
    evidenceCount: c.evidenceCount,
    evidence: c.evidence,
    confidence: Number(c.confidence.toFixed(2)),
    status: "forming",
    createdRound,
    prediction: predictionFor(c.type),
  };
}

function predictionFor(type: TheoryType): string {
  switch (type) {
    case "mutual_bond":
    case "one_way_loyalty":
      return "the first player will choose the second player again when given a free choice";
    case "alliance":
      return "the two players will make the same choice in the test dilemma (both cooperate)";
    case "rivalry":
      return "the two players will make opposite choices in the test";
    case "conformist":
      return "the player will follow the stated majority even when breaking it pays more";
    case "contrarian":
      return "the player will break from the stated majority";
    case "risk_seeker":
      return "the player will take the risky option in the test";
    case "risk_averse":
      return "the player will take the safe option in the test";
    case "prediction_link":
      return "the predictor will again correctly call the target's choice";
    case "repeated_selection":
      return "the player will select the same target again";
  }
}

/** Was the theory's prediction borne out by the test round's answers? */
export function resolveTheory(
  theory: Theory,
  ctx: {
    /** for selection tests: playerId -> chosen target id */
    selections?: Record<string, string>;
    /** for choice tests: playerId -> chosen option id */
    choices?: Record<string, string>;
    /** the option id that represents the "risky" / "against-majority" branch */
    riskyOptionId?: string;
    safeOptionId?: string;
    againstMajorityOptionId?: string;
    withMajorityOptionId?: string;
    /** for prediction tests */
    predictionCorrect?: boolean;
  },
): { status: "strengthened" | "discarded"; confidence: number; held: boolean } {
  const [p1, p2] = theory.players;
  let held = false;

  switch (theory.type) {
    case "mutual_bond":
    case "one_way_loyalty":
    case "repeated_selection":
      held = !!ctx.selections && p1 !== undefined && ctx.selections[p1] === p2;
      break;
    case "alliance":
      if (ctx.choices && p1 && p2) held = ctx.choices[p1] === ctx.choices[p2];
      break;
    case "rivalry":
      if (ctx.choices && p1 && p2) held = ctx.choices[p1] !== ctx.choices[p2];
      break;
    case "conformist":
      held =
        !!ctx.choices && !!p1 && ctx.choices[p1] === ctx.withMajorityOptionId;
      break;
    case "contrarian":
      held =
        !!ctx.choices && !!p1 && ctx.choices[p1] === ctx.againstMajorityOptionId;
      break;
    case "risk_seeker":
      held = !!ctx.choices && !!p1 && ctx.choices[p1] === ctx.riskyOptionId;
      break;
    case "risk_averse":
      held = !!ctx.choices && !!p1 && ctx.choices[p1] === ctx.safeOptionId;
      break;
    case "prediction_link":
      held = ctx.predictionCorrect === true;
      break;
  }

  const prior = theory.confidence;
  const confidence = held
    ? Math.min(0.97, prior + 0.15 + (1 - prior) * 0.1)
    : Math.max(0.05, prior - 0.28);

  return {
    status: held ? "strengthened" : "discarded",
    confidence: Number(confidence.toFixed(2)),
    held,
  };
}
