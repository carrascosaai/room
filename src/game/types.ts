// ─────────────────────────────────────────────────────────────
// ROOM — core domain types
// The deterministic game engine owns all of this. The LLM layer
// may READ these structures but must never mutate them.
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

// ---------- Questions ----------

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

export type RoundKind =
  | "individual" // Round type A — private individual decision
  | "group_vote" // Round type B — pick a player
  | "social_dilemma" // Round type C — cooperate / betray between players
  | "majority_minority" // Round type D — safe vs risky, conformity signal
  | "prediction" // predict what the room / a player will do
  | "trust" // choose who to rely on
  // engine-generated special rounds:
  | "ai_observation"
  | "ai_theory"
  | "ai_theory_test"
  | "ai_intervention";

export interface QuestionOption {
  id: string; // "A" | "B" | "C" ...
  label: Localized;
  tags: BehaviorTags;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  /** round kinds this question can be used for */
  kinds: RoundKind[];
  prompt: Localized;
  options: QuestionOption[];
  /** 1 (easy / warm-up) .. 3 (heavy dilemma) */
  difficulty: 1 | 2 | 3;
  /** 0 (safe) .. 3 (spicy). Keeps salseo bounded. */
  socialSensitivity: 0 | 1 | 2 | 3;
  /** can this question be repurposed to test a theory? */
  theoryTestable: boolean;
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
}

export interface GroupModel {
  edges: Record<string, RelationEdge>; // key = `${from}>${to}`
  /** vote concentration per round id: 0 (spread) .. 1 (unanimous) */
  voteConcentration: Record<string, number>;
}

// ---------- Theories ----------

export type TheoryType =
  | "repeated_selection"
  | "alliance"
  | "mutual_bond"
  | "one_way_loyalty"
  | "conformist"
  | "contrarian"
  | "rivalry"
  | "prediction_link"
  | "risk_seeker"
  | "risk_averse";

export type TheoryStatus =
  | "forming"
  | "announced"
  | "testing"
  | "strengthened"
  | "discarded";

export interface Theory {
  id: string;
  type: TheoryType;
  players: string[];
  evidenceCount: number;
  evidence: string; // deterministic factual summary (never a claim about feelings)
  confidence: number; // 0..1
  priorConfidence?: number;
  status: TheoryStatus;
  testRoundId?: string;
  /** what the engine predicts will happen in the test */
  prediction?: string;
  createdRound: number;
}

// ---------- Rounds & answers ----------

export interface RoundParticipantPrompt {
  /** player id -> option ids visible to that player (for asymmetric rounds) */
  [playerId: string]: string[];
}

export interface Round {
  id: string;
  index: number; // 0-based position in the game
  kind: RoundKind;
  questionId?: string;
  /** players who must answer this round (subset for dilemmas) */
  participants: string[];
  /** engine-generated title/body for special rounds */
  title?: Localized;
  body?: Localized;
  /** option overrides for special / asymmetric rounds, keyed by player id.
   *  "*" applies to everyone. */
  optionsByPlayer?: Record<string, QuestionOption[]>;
  /** which theory this round tests, if any */
  theoryId?: string;
  /** pairings for dilemma rounds (each entry [a, b] resolves pairwise) */
  pairs?: [string, string][];
  /** players who answer a prediction instead of the main choice (targeted rounds) */
  predictors?: string[];
  /** seconds allowed to answer */
  timeLimit: number;
  createdAt: number;
}

export interface Answer {
  roundId: string;
  playerId: string;
  optionId: string;
  /** for prediction rounds: the player id being predicted about */
  targetId?: string;
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
  score: number;
}

// ---------- Game state machine ----------

export type GamePhase =
  | "LOBBY"
  | "ROUND_INTRO"
  | "ANSWERING"
  | "REVEAL"
  | "AI_OBSERVATION"
  | "AI_THEORY"
  | "AI_THEORY_TEST"
  | "AI_INTERVENTION"
  | "ROUND_RESULT"
  | "FINAL_RESULTS";

export interface AiMessage {
  id: string;
  /** kind drives the icon / styling on the client */
  kind:
    | "observation"
    | "theory"
    | "theory_result"
    | "intervention"
    | "quip"
    | "final";
  /** localized text; both langs always present so mixed-language rooms work */
  text: Localized;
  roundIndex: number;
  at: number;
}

export interface RoundOutcome {
  roundId: string;
  /** localized human-readable summary lines shown on the reveal screen */
  lines: Localized[];
  /** score deltas applied this round, keyed by player id */
  scoreDelta: Record<string, number>;
  /** majority option id for majority_minority rounds */
  majorityOptionId?: string;
  /** players who went against the room */
  contrarians?: string[];
}

export interface GameState {
  code: string;
  phase: GamePhase;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  players: Player[];
  hostId: string;

  /** planned arc: ordered round "slots" the selector fills */
  plan: RoundSlot[];
  rounds: Round[];
  currentRoundIndex: number; // index into `rounds`
  answers: Answer[];

  behavior: Record<string, BehaviorProfile>; // playerId -> profile
  group: GroupModel;
  theories: Theory[];

  outcomes: RoundOutcome[];
  aiMessages: AiMessage[];

  /** monotonically increasing; clients poll and diff on this */
  version: number;
  /** unix ms deadline for the current phase (advisory for clients) */
  phaseDeadline?: number;
  /** rng seed for deterministic selection within a game */
  seed: number;
  usedQuestionIds: string[];
  /** populated once phase === FINAL_RESULTS */
  report?: import("./report").FinalReport;
}

export type RoundSlotType =
  | RoundKind
  | "warmup"
  | "observation_slot"
  | "theory_slot"
  | "intervention_slot"
  | "final_slot";

export interface RoundSlot {
  type: RoundSlotType;
  /** dimensions this slot ideally gathers evidence on */
  focus?: Dimension[];
}
