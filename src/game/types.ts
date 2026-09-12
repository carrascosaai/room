// ─────────────────────────────────────────────────────────────
// ROOM — core domain types
// The deterministic game engine owns all of this. The LLM layer
// may READ these structures but must never mutate them.
//
// Core loop: OBSERVATION -> HYPOTHESIS -> TEST -> DECISION ->
// REVEAL -> CONFIDENCE_UPDATE. See ROOM_REDESIGN.md.
// ─────────────────────────────────────────────────────────────

export type Lang = "es" | "en";

export type Localized = Record<Lang, string>;

// ---------- Behavioral dimensions ----------

export const DIMENSIONS = [
  "risk",
  "competitiveness",
  "patience",
  "greed",
  "loyalty",
  "conformity",
  "contrarianism",
  "trust",
  "cooperation",
  "individualism",
  "impulsivity",
  "consistency",
  "socialAlignment",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/** Signal a chosen option sends about a dimension, in [-1, 1]. */
export type BehaviorTags = Partial<Record<Dimension, number>>;

export type Trend = "rising" | "falling" | "stable";

export interface DimensionState {
  value: number; // 0..1
  confidence: number; // 0..1
  evidenceCount: number;
  trend: Trend;
  /** rolling observations, most recent last (capped) */
  history: number[];
}

export type BehaviorProfile = Record<Dimension, DimensionState>;

// ---------- Questions (observation rounds) ----------

export type QuestionCategory =
  | "strategy"
  | "money"
  | "risk"
  | "competition"
  | "loyalty"
  | "trust"
  | "cooperation"
  | "group_behavior"
  | "funny_dilemma"
  | "social_choice"
  | "light_spicy"
  | "betrayal"
  | "alliance"
  | "uncertainty"
  | "contrarian";

/** Observation round kinds — these generate the behavioral signal the
 *  hypothesis system reads. Plain decisions, no theories attached. */
export type ObservationKind =
  | "individual" // private individual decision
  | "group_vote" // pick a player
  | "social_dilemma" // cooperate / betray between players
  | "majority_minority" // safe vs risky, conformity signal
  | "trust"; // choose who to rely on

export type RoundKind =
  | ObservationKind
  | "hypothesis" // a player authors a theory about another player (+ optional counter-theory)
  | "theory_test"; // the target's private decision that resolves the hypothesis (+ counter)

export interface QuestionOption {
  id: string; // "A" | "B" | "C" ...
  label: Localized;
  tags: BehaviorTags;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  /** round kinds this question can be used for */
  kinds: ObservationKind[];
  prompt: Localized;
  options: QuestionOption[];
  /** 1 (easy / warm-up) .. 3 (heavy dilemma) */
  difficulty: 1 | 2 | 3;
  /** 0 (safe) .. 3 (spicy). Keeps salseo bounded. */
  socialSensitivity: 0 | 1 | 2 | 3;
}

// ---------- Relationships / group model ----------

export interface RelationEdge {
  from: string; // player id
  to: string; // player id
  selectedCount: number; // times `from` picked `to` in vote/trust rounds
  protectedCount: number; // times `from` chose `to` for protection
  cooperatedCount: number; // mutual-cooperate dilemmas
  betrayedCount: number; // `from` betrayed `to`
  alignedCount: number; // same option on comparable rounds
  comparableCount: number;
  predictedCorrect: number;
  predictedTotal: number;
  accusedCount: number; // legacy counter, kept for schema stability; unused by new content
  matchedTasteCount: number; // legacy counter, kept for schema stability; unused by new content
}

export interface GroupModel {
  edges: Record<string, RelationEdge>; // key = `${from}>${to}`
  /** vote concentration per round id: 0 (spread) .. 1 (unanimous) */
  voteConcentration: Record<string, number>;
}

// ---------- Hypotheses ----------

export type HypothesisCategory =
  | "loyalty"
  | "trust"
  | "money"
  | "social"
  | "competition"
  | "relationships"
  | "spicy";

export type HypothesisStatus = "active" | "confirmed" | "discarded";

export interface Hypothesis {
  id: string;
  creatorId: string;
  targetId: string;
  category: HypothesisCategory;
  dimension: Dimension;
  /** which polarity of the dimension this hypothesis claims */
  direction: "high" | "low";
  /** RELATIONSHIPS / SPICY: "target prefers X over comparisonTargetId" */
  comparisonTargetId?: string;
  templateId: string;
  statement: Localized;
  /** true until the creator's identity is shown (default) */
  anonymous: boolean;
  revealed: boolean;
  confidence: number; // 0..100
  initialConfidence: number;
  evidenceCount: number;
  supportingEvidence: number;
  contradictingEvidence: number;
  status: HypothesisStatus;
  /** id of the hypothesis this one opposes (same target+dimension, opposite direction) */
  counterOf?: string;
  /** was this hypothesis authored by a player, or auto-filled because nobody acted in time? */
  autoFilled: boolean;
  createdRound: number;
  testRoundId?: string;
}

export interface HypothesisChallenge {
  id: string;
  hypothesisId: string;
  challengerId: string;
  stake: number;
  /** filled once the linked test resolves */
  won?: boolean;
}

export interface TheoryTest {
  id: string;
  hypothesisIds: string[]; // 1 (solo) or 2 (hypothesis + counter-theory)
  targetId: string;
  dimension: Dimension;
  stakes: "low" | "medium" | "high";
  templateId: string;
  scenario: Localized;
  /** RELATIONSHIPS/SPICY tests offer a player choice instead of A/B */
  comparisonOptions?: [string, string];
  optionA: { label: Localized; confirmsHigh: boolean };
  optionB: { label: Localized; confirmsHigh: boolean };
  decision?: string; // "A" | "B" (or a player id for comparison tests)
}

// ---------- Rounds & answers ----------

export interface Round {
  id: string;
  index: number; // 0-based position in the game
  kind: RoundKind;
  questionId?: string;
  /** players who must answer this round */
  participants: string[];
  title?: Localized;
  body?: Localized;
  /** option overrides for special / asymmetric rounds, keyed by player id.
   *  "*" applies to everyone. */
  optionsByPlayer?: Record<string, QuestionOption[]>;
  /** pairings for dilemma rounds (each entry [a, b] resolves pairwise) */
  pairs?: [string, string][];
  /** players who answer a prediction instead of the main choice (targeted rounds) */
  predictors?: string[];
  /** seconds allowed to answer */
  timeLimit: number;
  createdAt: number;

  // ── hypothesis-cycle fields ──
  /** hypothesis kind: who gets to author this cycle */
  authorId?: string;
  /** the hypothesis this round announced (once created) */
  hypothesisId?: string;
  /** a counter-theory filed against `hypothesisId`, if any */
  counterHypothesisId?: string;
  /** theory_test kind: the built test */
  test?: TheoryTest;
}

export interface Answer {
  roundId: string;
  playerId: string;
  optionId: string;
  at: number;
}

// ---------- Players ----------

export interface Player {
  id: string;
  nickname: string;
  lang: Lang;
  isHost: boolean;
  connected: boolean;
  joinedAt: number;
  lastSeen: number;
  /** Game Score — participation + observation-round outcomes */
  score: number;
  /** Theory Score — how good this player's hypotheses about others turned out to be */
  theoryScore: number;
  /** rounds where this player was the hypothesis author (fairness rotation) */
  authorCount: number;
}

// ---------- Game state machine ----------

export type GamePhase =
  | "LOBBY"
  | "ROUND_INTRO"
  | "PRIVATE_DECISION"
  | "REVEAL"
  | "HYPOTHESIS"
  | "TEST_SETUP"
  | "CONFIDENCE_UPDATE"
  | "FINAL_REPORT";

export interface AiMessage {
  id: string;
  /** kind drives the icon / styling on the client */
  kind:
    | "observation" // flavor line after an observation round
    | "hypothesis" // "I HAVE A THEORY" framing
    | "counter_theory" // "someone disagrees"
    | "test_result" // the target's decision, stated plainly
    | "confidence_update" // confidence moved, with reasoning
    | "salseo" // ambient commentary ("3 people have theories about Carlos")
    | "final"; // closing analysis
  /** localized text; both langs always present so mixed-language rooms work */
  text: Localized;
  /** true once an LLM has rephrased this message — never re-polished after */
  polished?: boolean;
  roundIndex: number;
  at: number;
}

export interface RoundOutcome {
  roundId: string;
  /** localized human-readable summary lines shown on the reveal screen */
  lines: Localized[];
  /** score deltas applied this round, keyed by player id */
  scoreDelta: Record<string, number>;
  theoryScoreDelta?: Record<string, number>;
  /** majority option id for majority_minority rounds */
  majorityOptionId?: string;
  /** players who went against the room */
  contrarians?: string[];
}

/** In-progress hypothesis cycle — lives on GameState only while phase is
 *  HYPOTHESIS or TEST_SETUP, before it's turned into a real Round + Hypothesis. */
export interface PendingCycle {
  roundIndex: number;
  authorId: string;
  /** the author's submission, once made */
  submitted?: {
    targetId: string;
    category: HypothesisCategory;
    templateId: string;
    anonymous: boolean;
    counterOf?: string; // filing a counter-theory against an earlier active hypothesis instead
  };
  /** counter-theory filed by someone other than the author, if any */
  counter?: {
    creatorId: string;
    templateId: string;
    anonymous: boolean;
  };
  /** points challenges filed against the (about-to-exist) hypothesis */
  challenges: { challengerId: string; stake: number }[];
  stakes?: "low" | "medium" | "high";
}

export interface GameState {
  code: string;
  phase: GamePhase;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  players: Player[];
  hostId: string;

  targetRounds: number;
  rounds: Round[];
  currentRoundIndex: number; // index into `rounds`
  answers: Answer[];

  behavior: Record<string, BehaviorProfile>; // playerId -> profile
  group: GroupModel;
  hypotheses: Hypothesis[];
  challenges: HypothesisChallenge[];
  pendingCycle?: PendingCycle;

  outcomes: RoundOutcome[];
  aiMessages: AiMessage[];

  /** monotonically increasing; clients poll and diff on this */
  version: number;
  /** unix ms deadline for the current phase (advisory for clients) */
  phaseDeadline?: number;
  /** rng seed for deterministic selection within a game */
  seed: number;
  usedQuestionIds: string[];
  usedTestTemplateIds: string[];
  /** populated once phase === FINAL_REPORT */
  report?: import("./report").FinalReport;
}
