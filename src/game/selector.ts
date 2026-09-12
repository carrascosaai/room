import { QUESTIONS, QUESTIONS_BY_ID, isPlayerTargetKind } from "./questions";
import { underexploredDimensions } from "./behavior";
import { mulberry32, hashString, shuffle } from "@/lib/rng";
import type {
  Dimension,
  GameState,
  ObservationKind,
  Player,
  Question,
  QuestionOption,
  Round,
} from "./types";

// ─────────────────────────────────────────────────────────────
// The selector turns "it's time for a new round" into a concrete
// observation Round. Hypothesis-cycle rounds are built directly by
// the engine (via hypothesis.ts), since they need live player input
// (target, statement, stakes) rather than a pre-scored question pick.
// ─────────────────────────────────────────────────────────────

export const WARMUP_ROUNDS = 3;
/** rounds 0..(WARMUP_ROUNDS-1) are pure observation; the last 2 are the
 *  guaranteed finale hypothesis cycle; everything between is a weighted mix */
export const DEFAULT_TARGET_ROUNDS = 12;

const OBSERVATION_KINDS: ObservationKind[] = [
  "individual",
  "majority_minority",
  "social_dilemma",
  "trust",
  "group_vote",
];

export function rngFor(state: GameState, salt: string): () => number {
  return mulberry32((state.seed ^ hashString(salt)) >>> 0);
}

export function timeLimitFor(kind: Round["kind"]): number {
  switch (kind) {
    case "social_dilemma":
      return 25;
    case "hypothesis":
      return 25;
    case "theory_test":
      return 20;
    default:
      return 20;
  }
}

/** Build the A/B/... options for a player-target round from the roster. */
export function playerOptions(players: Player[], exclude: string[]): QuestionOption[] {
  return players
    .filter((p) => !exclude.includes(p.id))
    .map((p) => ({ id: p.id, label: { en: p.nickname, es: p.nickname }, tags: {} }));
}

function scoreQuestion(q: Question, wantDims: Dimension[], rand: () => number): number {
  let s = rand() * 0.25;
  const focus = wantDims.slice(0, 4);
  let focusSignal = 0;
  let totalSignal = 0;
  for (const opt of q.options) {
    for (const k of Object.keys(opt.tags) as Dimension[]) {
      const mag = Math.abs(opt.tags[k] ?? 0);
      totalSignal += mag;
      if (focus.includes(k)) focusSignal += mag;
    }
  }
  s += focusSignal * 1.4;
  if (totalSignal > 0) s += (focusSignal / totalSignal) * 0.8;
  return s;
}

export function chooseQuestion(
  state: GameState,
  kind: ObservationKind,
  focus: Dimension[] | undefined,
  salt: string,
): Question {
  const rand = rngFor(state, "q" + salt);
  const wantDims = focus ?? (underexploredDimensions(Object.values(state.behavior)) as Dimension[]);
  const playerTarget = isPlayerTargetKind(kind);
  const matches = (q: Question) => q.kinds.includes(kind) && (playerTarget ? q.options.length === 0 : q.options.length >= 2);
  const pool = QUESTIONS.filter((q) => matches(q) && !state.usedQuestionIds.includes(q.id));
  const usable = pool.length > 0 ? pool : QUESTIONS.filter(matches);
  let best = usable[0]!;
  let bestScore = -Infinity;
  for (const q of usable) {
    const sc = scoreQuestion(q, wantDims, rand);
    if (sc > bestScore) {
      bestScore = sc;
      best = q;
    }
  }
  return best;
}

export function makeRound(partial: Omit<Round, "createdAt" | "timeLimit"> & { timeLimit?: number }): Round {
  return {
    ...partial,
    timeLimit: partial.timeLimit ?? timeLimitFor(partial.kind),
    createdAt: Date.now(),
  };
}

/** Decide what kind of NEW round slot this is (not a continuation of an
 *  in-progress hypothesis cycle — the engine handles that separately). */
export function chooseSlotKind(state: GameState, index: number): "observation" | "hypothesis" {
  const total = state.targetRounds;
  if (index < WARMUP_ROUNDS) return "observation";
  if (index >= total - 1) return "hypothesis"; // guaranteed finale cycle
  const rand = rngFor(state, "slot" + index);
  // ~35% of the remaining slots become hypothesis cycles — matches the
  // "60% decisions / ~30% theories / rest salseo-as-flavor" brief ratio
  return rand() < 0.35 ? "hypothesis" : "observation";
}

export function buildObservationRound(state: GameState, index: number): Round {
  const activePlayers = state.players.filter((p) => p.connected);
  const roster = activePlayers.length >= 3 ? activePlayers : state.players;
  const allIds = roster.map((p) => p.id);
  const idBase = `r${index}`;
  const rand = rngFor(state, "kind" + idBase);
  const kind = pickKind(state, index, rand);

  if (kind === "social_dilemma") {
    const q = chooseQuestion(state, "social_dilemma", undefined, idBase);
    const shuffled = shuffle(rngFor(state, "pair" + idBase), allIds);
    const pairs: [string, string][] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) pairs.push([shuffled[i]!, shuffled[i + 1]!]);
    if (shuffled.length % 2 === 1 && pairs.length > 0) pairs.push([shuffled[shuffled.length - 1]!, shuffled[0]!]);
    return makeRound({
      id: idBase,
      index,
      kind: "social_dilemma",
      questionId: q.id,
      participants: allIds,
      pairs,
      title: { en: "Dilemma", es: "Dilema" },
      body: q.prompt,
    });
  }

  if (kind === "group_vote" || kind === "trust") {
    const q = chooseQuestion(state, kind, undefined, idBase);
    return makeRound({
      id: idBase,
      index,
      kind,
      questionId: q.id,
      participants: allIds,
      optionsByPlayer: Object.fromEntries(roster.map((p) => [p.id, playerOptions(roster, [p.id])])),
    });
  }

  const q = chooseQuestion(state, kind, undefined, idBase);
  return makeRound({
    id: idBase,
    index,
    kind,
    questionId: q.id,
    participants: allIds,
  });
}

function pickKind(state: GameState, index: number, rand: () => number): ObservationKind {
  // steer variety: don't repeat the same observation kind twice in a row
  const prev = state.rounds[state.rounds.length - 1]?.kind;
  const pool = OBSERVATION_KINDS.filter((k) => k !== prev);
  return pool.length > 0 ? pool[Math.floor(rand() * pool.length)]! : OBSERVATION_KINDS[0]!;
}

export function optionsFromQuestion(questionId: string | undefined): QuestionOption[] {
  if (!questionId) return [];
  return QUESTIONS_BY_ID[questionId]?.options ?? [];
}
