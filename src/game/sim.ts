import { advance, createGame, currentRound, freshPlayer, optionsForPlayer, startGame, submitAnswer, respondents } from "./engine";
import { QUESTIONS_BY_ID } from "./questions";
import { mulberry32 } from "@/lib/rng";
import type { Dimension, GameState, Lang } from "./types";
import { DIMENSIONS } from "./types";

// ─────────────────────────────────────────────────────────────
// Headless simulation. Used by tests and `npm run simulate`.
// Bots are deterministic given a seed + their trait vector. Bots
// never author hypotheses themselves — the engine's auto-fill
// fallback (a human not acting in time) covers that, which keeps
// the simulator simple while still exercising the full loop.
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

export function botChoose(state: GameState, spec: BotSpec, rand: () => number): { optionId: string } | null {
  const round = currentRound(state);
  if (!round) return null;
  const opts = optionsForPlayer(round, spec.id);
  if (opts.length === 0) return null;

  // player-target round: every option id is a player id
  const isPlayerPick = opts.length >= 2 && opts.every((o) => state.players.some((p) => p.id === o.id));
  if (isPlayerPick) {
    if (spec.favourite && opts.some((o) => o.id === spec.favourite) && rand() < 0.75) {
      return { optionId: spec.favourite };
    }
    return { optionId: opts[Math.floor(rand() * opts.length)]!.id };
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

function tagsFor(round: NonNullable<ReturnType<typeof currentRound>>, playerId: string, optionId: string): Partial<Record<Dimension, number>> {
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
  hypotheses: GameState["hypotheses"];
}

export function runSimulatedGame(bots: BotSpec[], opts: { seed?: number; mutateAt?: number; mutate?: (bots: BotSpec[]) => BotSpec[] } = {}): SimResult {
  const rand = mulberry32(opts.seed ?? 12345);
  let state = createGame("SIM1", { id: bots[0]!.id, nickname: bots[0]!.nickname, lang: "en" });
  state = { ...state, seed: opts.seed ?? 12345 };
  for (const b of bots.slice(1)) state = addBot(state, b);
  const started = startGame(state);
  state = started.state;
  if (started.error) throw new Error("sim start failed: " + started.error);

  let liveBots = bots;
  let guard = 0;

  while (state.phase !== "FINAL_REPORT" && guard++ < 400) {
    if (opts.mutateAt && state.currentRoundIndex === opts.mutateAt && opts.mutate) {
      liveBots = opts.mutate(liveBots);
    }

    if (state.phase === "PRIVATE_DECISION") {
      const round = currentRound(state)!;
      for (const id of respondents(round)) {
        const bot = liveBots.find((b) => b.id === id);
        if (!bot) continue;
        const choice = botChoose(state, bot, rand);
        if (choice) state = submitAnswer(state, { playerId: id, optionId: choice.optionId }).state;
      }
      state = advance(state);
    } else {
      // HYPOTHESIS / TEST_SETUP: bots never author — the engine auto-fills
      // once the phase deadline passes, which `advance()` only does once
      // `shouldAutoAdvance` says the deadline is up. In sim we just nudge
      // straight through since there's no real clock here.
      state = advance(state);
    }
  }

  return { state, rounds: state.rounds.length, aiMessages: state.aiMessages.length, hypotheses: state.hypotheses };
}

function addBot(state: GameState, b: BotSpec): GameState {
  return {
    ...state,
    players: [...state.players, freshPlayer({ id: b.id, nickname: b.nickname, lang: b.lang ?? "en" }, false)],
    version: state.version + 1,
  };
}

// ---------- standard cast ----------

export function standardCast(): BotSpec[] {
  const base: Record<Dimension, number> = Object.fromEntries(DIMENSIONS.map((d) => [d, 0.5])) as Record<Dimension, number>;
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
