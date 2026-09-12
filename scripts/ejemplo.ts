/* eslint-disable no-console */
import {
  advance,
  currentRound,
  freshPlayer,
  optionsForPlayer,
  respondents,
  startGame,
  submitAnswer,
  createGame,
} from "../src/game/engine";
import { botChoose, type BotSpec } from "../src/game/sim";
import { QUESTIONS_BY_ID } from "../src/game/questions";
import { mulberry32 } from "../src/lib/rng";
import type { GameState, Dimension } from "../src/game/types";
import { DIMENSIONS } from "../src/game/types";

// Narrates a full ROOM game: observation rounds building a behavior
// profile, then the hypothesis loop (someone has a theory, ROOM builds
// a test, the target decides in private, confidence moves). Run:
// npx tsx scripts/ejemplo.ts [seed]

const base = Object.fromEntries(DIMENSIONS.map((d) => [d, 0.5])) as Record<Dimension, number>;

const CAST: BotSpec[] = [
  { id: "p_fer", nickname: "Fernando", lang: "es", traits: { ...base, risk: 0.9, competitiveness: 0.85, impulsivity: 0.7, greed: 0.6 } },
  { id: "p_ana", nickname: "Ana", lang: "es", traits: { ...base, conformity: 0.9, socialAlignment: 0.85, contrarianism: 0.1, cooperation: 0.7 } },
  { id: "p_pab", nickname: "Pablo", lang: "es", traits: { ...base, loyalty: 0.9, cooperation: 0.85, individualism: 0.2 }, favourite: "p_fer" },
  { id: "p_car", nickname: "Carlos", lang: "es", traits: { ...base, cooperation: 0.1, greed: 0.9, individualism: 0.9, loyalty: 0.15 } },
  { id: "p_mar", nickname: "María", lang: "es", traits: { ...base, patience: 0.9, consistency: 0.85, risk: 0.15, contrarianism: 0.6, cooperation: 0.75 } },
];

const NAME: Record<string, string> = Object.fromEntries(CAST.map((b) => [b.id, b.nickname]));

function seedGame(seed: number): GameState {
  let s = createGame("K7XQ", { id: CAST[0]!.id, nickname: CAST[0]!.nickname, lang: "es" });
  s = { ...s, seed };
  for (const b of CAST.slice(1)) {
    s = { ...s, players: [...s.players, freshPlayer({ id: b.id, nickname: b.nickname, lang: "es" }, false)] };
  }
  return startGame(s).state;
}

function optLabel(state: GameState, round: NonNullable<ReturnType<typeof currentRound>>, pid: string, oid: string): string {
  const opts = optionsForPlayer(round, pid);
  const o = opts.find((x) => x.id === oid);
  if (!o) return oid;
  const asPlayer = state.players.find((p) => p.id === o.id);
  return asPlayer ? asPlayer.nickname : o.label.es;
}

const AI_TAGS: Record<string, string> = {
  hypothesis: "🧠  TENGO UNA TEORÍA",
  counter_theory: "🤨  CONTRATEORÍA",
  test_result: "📋  DECISIÓN",
  confidence_update: "📈  CONFIANZA",
  final: "🏁  ANÁLISIS FINAL",
};

function run(seed: number) {
  const rand = mulberry32(seed + 1);
  let state = seedGame(seed);

  let roundNo = 0;
  let guard = 0;
  const printedMsgs = new Set<string>();

  const flushAi = () => {
    for (const m of state.aiMessages) {
      if (printedMsgs.has(m.id)) continue;
      printedMsgs.add(m.id);
      console.log(`\n    ${AI_TAGS[m.kind] ?? "IA"}`);
      console.log(`    "${m.text.es}"`);
    }
  };

  while (state.phase !== "FINAL_REPORT" && guard++ < 300) {
    const round = currentRound(state);

    if (state.phase === "ROUND_INTRO" && round) {
      roundNo++;
      const q = round.questionId ? QUESTIONS_BY_ID[round.questionId] : undefined;
      const title = round.title?.es;
      const prompt = round.body?.es ?? q?.prompt.es;
      console.log(`\n━━━ RONDA ${roundNo} · ${round.kind.toUpperCase()} ${title ? `· ${title}` : ""} ━━━`);
      if (prompt) console.log(`  ${prompt}`);
    }

    if (state.phase === "PRIVATE_DECISION" && round) {
      for (const id of respondents(round)) {
        const bot = CAST.find((b) => b.id === id);
        if (!bot) continue;
        const c = botChoose(state, bot, rand);
        if (c) state = submitAnswer(state, { playerId: id, optionId: c.optionId }).state;
      }
      state = advance(state);

      const rAnswers = state.answers.filter((a) => a.roundId === round.id);
      for (const a of rAnswers) {
        console.log(`       ${NAME[a.playerId]}: ${optLabel(state, round, a.playerId, a.optionId)}`);
      }
      const outcome = state.outcomes.find((o) => o.roundId === round.id);
      if (outcome) for (const l of outcome.lines) console.log(`      → ${l.es}`);
      flushAi();
      continue;
    }

    state = advance(state);
    flushAi();
  }

  const r = state.report!;
  console.log(`\n\n═══════════ RESULTADO FINAL ═══════════\n`);
  for (const s of r.superlatives) {
    console.log(`  ${s.label.es.padEnd(24)} → ${s.playerId ? NAME[s.playerId] : "—"}`);
  }
  if (r.biggestTheory) console.log(`  ${"Teoría más fuerte".padEnd(24)} → "${r.biggestTheory.statement.es}" (${r.biggestTheory.confidence}%)`);
  if (r.biggestPlotTwist) console.log(`  ${"Mayor giro de guion".padEnd(24)} → "${r.biggestPlotTwist.statement.es}" (${r.biggestPlotTwist.confidence}%)`);
  if (r.mostControversial) console.log(`  ${"Más controvertido".padEnd(24)} → "${r.mostControversial.a.es}" vs "${r.mostControversial.b.es}"`);
  console.log(`  ${"Teorías puestas a prueba".padEnd(24)} → ${r.hypothesesTested} (confirmadas: ${r.hypothesesConfirmed})`);

  console.log(`\n  🏁 Análisis final:\n    "${r.finalAnalysis.es}"`);
  console.log(`\n  Clasificación (puntos de partida):`);
  r.standings.forEach((s, i) => console.log(`    ${i + 1}. ${NAME[s.playerId]?.padEnd(10)} ${s.score} pts (teoría: ${s.theoryScore})`));
}

const seed = Number(process.argv[2] ?? 20260910);
run(seed);
