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
  | "accusation" // point at a player — "who here is the most ___?"
  | "compat_probe" // private taste/values answer; the engine pairs the matches
  | "revenge" // a wronged player docks points from someone
  // ── AI-director mechanics (talk-heavy, played in the room) ──
  | "interrogation" // one player defends themselves out loud; the room rates + judges
  | "deal" // the AI privately offers two players a secret pact; the room hunts the tell
  | "prophecy" // the AI predicts one player's next move, out loud, in front of everyone
  | "movement" // everyone physically moves to a side
  | "movement_switch" // the room gets one more chance to convince someone to switch
  | "throne" // one seat, real power; the room can vote to overthrow whoever holds it
  | "whisper" // a private mole + private intel, out loud negotiation, then the room votes
  | "chemistry" // the AI tests a compatible pair's chemistry live, the room bets on the match
  | "faceoff" // the AI puts two players head-to-head, the room votes who wins
  // engine-generated special rounds:
  | "ai_observation"
  | "ai_theory"
  | "ai_theory_test"
  | "ai_intervention";

export type GameMode = "director" | "classic";

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
  accusedCount: number; // times `from` pointed at `to` in accusation rounds
  matchedTasteCount: number; // times `from` and `to` gave the same compat_probe answer
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
  | "risk_averse"
  | "high_compatibility" // two players keep thinking alike — salseo
  | "clashing_values" // two players are opposites on values — salseo
  | "wildcard"; // one player nobody can predict

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

  // ── talk / stage layer ──
  /** if > 0, an out-loud DISCUSSION phase runs before ANSWERING */
  talkSeconds?: number;
  /** what the room should be doing during the discussion (shown on the stage) */
  talkPrompt?: Localized;
  /** a physical instruction shown big on the stage ("stand up and move…") */
  stageInstruction?: Localized;
  /** everyone can see the running tally during ANSWERING (physical rounds) */
  liveTally?: boolean;
  /** the player on the spot this round (interrogation / prophecy subject) */
  hotSeatId?: string;
  /** interrogation: options for the consequence the room votes on */
  consequenceOptions?: QuestionOption[];
  /** deal: the secret pact offered to exactly two players */
  secretDeal?: {
    players: [string, string];
    /** points split between them if they pull it off uncaught */
    reward: number;
    /** localized description of what they must secretly do */
    task: Localized;
  };
  /** prophecy: the AI's public call about `hotSeatId`, resolved next round */
  prophecy?: {
    subjectId: string;
    /** "A" = will do the bold/risky thing, "B" = won't */
    predictedOptionId: string;
    label: Localized;
  };
  /** whisper: a private mole + private facts, only ever seen by their recipient */
  whisper?: {
    moleId: string;
    moleBriefing: Localized;
    intel: { playerId: string; text: Localized }[];
  };
  /** movement_switch: the movement round this one gives a second chance on */
  followsRoundId?: string;
  /** faceoff: the two contestants the room votes between (they don't vote themselves) */
  faceoffPair?: [string, string];
  /** which director move produced this round (for the manipulation log) */
  directorMoveId?: string;
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
  /** reputation economy — 0..100, start 50. The director manipulates these. */
  trust: number;
  suspicion: number;
  influence: number;
  /** rounds where this player was the centre of attention (director spreads it around) */
  spotlightCount: number;
}

// ---------- Game state machine ----------

export type GamePhase =
  | "LOBBY"
  | "ROUND_INTRO"
  | "DISCUSSION" // open floor — talk out loud (stage-driven)
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
    | "final"
    | "affinity" // "AFINIDAD DETECTADA" — two players keep matching
    | "accusation" // the room pointed at someone
    | "missions" // secret missions revealed
    | "hot_seat" // "X, defiéndete" — interrogation framing
    | "verdict" // the room's judgement on the hot seat
    | "prophecy" // "predigo que X…"
    | "prophecy_result" // whether the prophecy held
    | "deal_reveal" // whether a secret deal existed / was caught
    | "movement" // "levantaos y moveos"
    | "throne_result" // who holds the throne now, and why
    | "whisper_result" // whether the room caught the mole
    | "chemistry_result" // whether the tested pair actually matched
    | "faceoff_result" // who won the head-to-head
    | "confession"; // the director's manipulation log at the end
  /** localized text; both langs always present so mixed-language rooms work */
  text: Localized;
  /** true once an LLM has rephrased this message — never re-polished after */
  polished?: boolean;
  roundIndex: number;
  at: number;
}

// ---------- Secret missions ----------

export type MissionId =
  | "betray_twice"
  | "never_cooperate"
  | "win_trust_votes"
  | "mirror_target"
  | "oppose_target"
  | "finish_bottom"
  | "stay_risky"
  | "get_protected"
  | "fixate_on_one"
  | "go_unnoticed";

export interface MissionAssignment {
  playerId: string;
  missionId: MissionId;
  /** for missions that reference another player */
  targetId?: string;
  /** filled at FINAL_RESULTS */
  completed?: boolean;
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

// ---------- The director (AI game master) ----------

export type DirectorSignal =
  | "warmup"
  | "bored_player"
  | "runaway_leader"
  | "cozy_pair"
  | "too_much_harmony"
  | "theory_failed"
  | "grudge"
  | "cadence"
  | "finale"
  | "throne_empty"
  | "throne_challenge"
  | "whisper_mole"
  | "movement_switch"
  | "chemistry"
  | "clash";

export interface DirectorMove {
  id: string;
  roundIndex: number;
  kind: RoundKind;
  signal: DirectorSignal;
  targets: string[];
  /** shown in the end-of-game confession ("what the AI did and why") */
  reason: Localized;
}

export interface DirectorState {
  /** rounds since a given player was in the spotlight */
  lastSpotlightRound: Record<string, number>;
  /** how many prophecy / movement / deal beats have run */
  beats: Record<string, number>;
  /** the id of an unresolved prophecy round, if any */
  pendingProphecyRoundId?: string;
}

export interface GameState {
  code: string;
  phase: GamePhase;
  mode: GameMode;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  players: Player[];
  hostId: string;

  /** classic mode: ordered round "slots" the selector fills */
  plan: RoundSlot[];
  /** director mode: how many rounds the session runs */
  targetRounds: number;
  rounds: Round[];
  currentRoundIndex: number; // index into `rounds`
  answers: Answer[];

  behavior: Record<string, BehaviorProfile>; // playerId -> profile
  group: GroupModel;
  theories: Theory[];
  missions: MissionAssignment[];

  director: DirectorState;
  directorLog: DirectorMove[];
  /** director mode: who currently holds the throne, if it's been claimed */
  throneHolderId?: string;

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
  | "accusation_slot"
  | "affinity_slot"
  | "final_slot";

export interface RoundSlot {
  type: RoundSlotType;
  /** dimensions this slot ideally gathers evidence on */
  focus?: Dimension[];
}
