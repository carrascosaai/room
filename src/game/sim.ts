import { advance, createGame, currentRound, freshPlayer, optionsForPlayer, startGame, submitAnswer, respondents } from "./engine";
import { QUESTIONS_BY_ID } from "./questions";
import { mulberry32 } from "@/lib/rng";
import type { Dimension, GameState, Lang } from "./types";
import { DIMENSIONS } from "./types";

// ─────────────────────────────────────────────────────────────
// Headless simulation. Used by tests and `npm run simulate`.
// Bots are deterministic given a seed + their trait vector.
// ─────────────────────────────────────────────────────────────

export interface BotSpec {
  id: string;
  nickname: string;
  traits: Partial<Record<Dimension, number>>; // target values in [0,1]
  /** id of a player this bot disproportionately favours in selection rounds */
  favourite?: string;
  lang?: Lang;
}

function traitVal(spec: BotSpec, d: Dimension): number {
  return spec.traits[d] ?? 0.5;
}

/** Score an option for a bot: how well its tags line up with the bot's traits. */
function optionScore(spec: BotSpec, tags: Partial<Record<Dimension, number>>): number {
  let s = 0;
  for (const d of Object.keys(tags) as Dimension[]) {
    const signal = tags[d]!; // -1..1
    const want = (traitVal(spec, d) - 0.5) * 2; // -1..1
    s += signal * want;
  }
  return s;
}

export function botChoose(
  state: GameState,
  spec: BotSpec,
  rand: () => number,
): { optionId: string } | null {
  const round = currentRound(state);
  if (!round) return null;
  const opts = optionsForPlayer(round, spec.id);
  if (opts.length === 0) return null;

  // player-target round: every option id is a player id (and it isn't a plain A/B question)
  const isPlayerPick =
    opts.length >= 2 &&
    opts.every((o) => state.players.some((p) => p.id === o.id)) &&
    !QUESTIONS_BY_ID[round.questionId ?? ""]?.options.some((qo) => opts.some((o) => o.id === qo.id));
  if (isPlayerPick) {
    if (spec.favourite && opts.some((o) => o.id === spec.favourite) && rand() < 0.75) {
      return { optionId: spec.favourite };
    }
    return { optionId: opts[Math.floor(rand() * opts.length)]!.id };
  }

  // yes/no prediction
  if (opts.length === 2 && opts.every((o) => o.id === "yes" || o.id === "no")) {
    return { optionId: rand() < 0.5 ? "yes" : "no" };
  }

  // taste / values probe — no behavioral tags. Pick deterministically from the
  // bot's trait vector so that *similar* bots reliably land on the same answer.
  if (round.kind === "compat_probe") {
    const flavour =
      (spec.traits.risk ?? 0.5) * 3.1 +
      (spec.traits.impulsivity ?? 0.5) * 2.3 +
      (spec.traits.cooperation ?? 0.5) * 1.7 +
      (spec.traits.contrarianism ?? 0.5) * 1.3;
    const idx = Math.floor(flavour * 7) % opts.length;
    return { optionId: opts[idx]!.id };
  }

  // choose by trait alignment, with a little noise
  let best = opts[0]!;
  let bestScore = -Infinity;
  for (const o of opts) {
    const tags = tagsFor(round, spec.id, o.id);
    const score = optionScore(spec, tags) + (rand() - 0.5) * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return { optionId: best.id };
}

function tagsFor(
  round: NonNullable<ReturnType<typeof currentRound>>,
  playerId: string,
  optionId: string,
): Partial<Record<Dimension, number>> {
  if (round.optionsByPlayer) {
    const opts = round.optionsByPlayer[playerId] ?? round.optionsByPlayer["*"];
    const found = opts?.find((o) => o.id === optionId);
    if (found) return found.tags;
  }
  if (round.questionId) {
    return QUESTIONS_BY_ID[round.questionId]?.options.find((o) => o.id === optionId)?.tags ?? {};
  }
  return {};
}

export interface SimResult {
  state: GameState;
  rounds: number;
  aiMessages: number;
  theories: GameState["theories"];
}

/** If this player has a secret mission that applies here, play toward it. */
function missionMove(
  state: GameState,
  round: NonNullable<ReturnType<typeof currentRound>>,
  playerId: string,
  rand: () => number,
): { optionId: string } | null {
  const m = state.missions.find((x) => x.playerId === playerId);
  if (!m) return null;
  const opts = optionsForPlayer(round, playerId);
  if (opts.length === 0) return null;
  const isDilemma = !!round.pairs?.some(([a, b]) => a === playerId || b === playerId);
  const isSelect = opts.every((o) => state.players.some((p) => p.id === o.id));
  const answerOf = (pid: string) =>
    state.answers.find((a) => a.roundId === round.id && a.playerId === pid)?.optionId;

  switch (m.missionId) {
    case "betray_twice":
      if (isDilemma && opts.some((o) => o.id === "B")) return { optionId: "B" };
      return null;
    case "never_cooperate":
      if (isDilemma && opts.some((o) => o.id === "B")) return { optionId: "B" };
      return null;
    case "fixate_on_one":
      if (isSelect && m.targetId && opts.some((o) => o.id === m.targetId)) {
        return { optionId: m.targetId };
      }
      return null;
    case "mirror_target": {
      if (!m.targetId || isSelect || isDilemma) return null;
      const t = answerOf(m.targetId);
      if (t && opts.some((o) => o.id === t)) return { optionId: t };
      return null;
    }
    case "oppose_target": {
      if (!m.targetId || isSelect || isDilemma) return null;
      const t = answerOf(m.targetId);
      if (t) {
        const other = opts.filter((o) => o.id !== t);
        if (other.length) return { optionId: other[Math.floor(rand() * other.length)]!.id };
      }
      return null;
    }
    case "stay_risky": {
      if (isSelect || isDilemma) return null;
      if (opts.some((o) => o.id === "B")) return { optionId: "B" };
      return null;
    }
    default:
      return null;
  }
}

export function runSimulatedGame(
  bots: BotSpec[],
  opts: {
    seed?: number;
    mutateAt?: number;
    mutate?: (bots: BotSpec[]) => BotSpec[];
    missionAware?: boolean;
    mode?: "director" | "classic";
  } = {},
): SimResult {
  const rand = mulberry32(opts.seed ?? 12345);
  let state = createGame(
    "SIM1",
    { id: bots[0]!.id, nickname: bots[0]!.nickname, lang: "en" },
    opts.mode ?? "classic",
  );
  state = { ...state, seed: opts.seed ?? 12345 };
  for (const b of bots.slice(1)) {
    const res = addBot(state, b);
    state = res;
  }
  const started = startGame(state);
  state = started.state;
  if (started.error) throw new Error("sim start failed: " + started.error);

  let liveBots = bots;
  let guard = 0;

  while (state.phase !== "FINAL_RESULTS" && guard++ < 400) {
    if (opts.mutateAt && state.currentRoundIndex === opts.mutateAt && opts.mutate) {
      liveBots = opts.mutate(liveBots);
    }

    if (state.phase === "ANSWERING") {
      const round = currentRound(state)!;
      const need = respondents(round);
      for (const id of need) {
        const bot = liveBots.find((b) => b.id === id);
        if (!bot) continue;
        const forced =
          opts.missionAware === false
            ? null
            : missionMove(state, round, id, rand);
        const choice = forced ?? botChoose(state, bot, rand);
        if (choice) {
          const res = submitAnswer(state, { playerId: id, optionId: choice.optionId });
          state = res.state;
        }
      }
      // all responders have answered (or been given the chance) → reveal
      state = advance(state);
    } else {
      state = advance(state);
    }
  }

  return {
    state,
    rounds: state.rounds.length,
    aiMessages: state.aiMessages.length,
    theories: state.theories,
  };
}

function addBot(state: GameState, b: BotSpec): GameState {
  return {
    ...state,
    players: [
      ...state.players,
      freshPlayer({ id: b.id, nickname: b.nickname, lang: b.lang ?? "en" }, false),
    ],
    version: state.version + 1,
  };
}

// ---------- standard cast ----------

export function standardCast(): BotSpec[] {
  const base: Record<Dimension, number> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, 0.5]),
  ) as Record<Dimension, number>;
  return [
    { id: "u1", nickname: "Risky", traits: { ...base, risk: 0.95, competitiveness: 0.75, impulsivity: 0.8, patience: 0.2, greed: 0.7 } },
    { id: "u2", nickname: "Safe", traits: { ...base, risk: 0.05, patience: 0.9, consistency: 0.85, impulsivity: 0.15, competitiveness: 0.3, greed: 0.3 } },
    { id: "u3", nickname: "Follower", traits: { ...base, conformity: 0.92, socialAlignment: 0.88, contrarianism: 0.08, individualism: 0.2 } },
    { id: "u4", nickname: "Devoted", traits: { ...base, loyalty: 0.92, cooperation: 0.8, individualism: 0.2 }, favourite: "u1" },
    { id: "u5", nickname: "Betrayer", traits: { ...base, cooperation: 0.08, greed: 0.92, individualism: 0.9, loyalty: 0.15 } },
    { id: "u6", nickname: "Contra", traits: { ...base, contrarianism: 0.92, conformity: 0.08, individualism: 0.75, socialAlignment: 0.2 } },
    { id: "u7", nickname: "Team", traits: { ...base, cooperation: 0.92, individualism: 0.08, loyalty: 0.75, greed: 0.2 } },
    { id: "u8", nickname: "Wild", traits: { ...base, impulsivity: 0.9, consistency: 0.12, risk: 0.65, patience: 0.2 } },
    { id: "u9", nickname: "Calm", traits: { ...base, patience: 0.92, impulsivity: 0.1, competitiveness: 0.25, risk: 0.3 } },
    { id: "u10", nickname: "Shark", traits: { ...base, competitiveness: 0.95, greed: 0.75, risk: 0.7, cooperation: 0.2 } },
  ];
}
