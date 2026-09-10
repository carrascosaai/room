/* eslint-disable no-console */
import {
  advance,
  createGame,
  currentRound,
  optionsForPlayer,
  respondents,
  startGame,
  submitAnswer,
} from "../src/game/engine";
import { botChoose, type BotSpec } from "../src/game/sim";
import { QUESTIONS_BY_ID } from "../src/game/questions";
import { missionText } from "../src/game/missions";
import { mulberry32 } from "../src/lib/rng";
import type { GameState, Dimension } from "../src/game/types";
import { DIMENSIONS } from "../src/game/types";

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
  const t = Date.now();
  for (const b of CAST.slice(1)) {
    s = {
      ...s,
      players: [
        ...s.players,
        { id: b.id, nickname: b.nickname, lang: "es", isHost: false, connected: true, joinedAt: t, lastSeen: t, score: 0 },
      ],
    };
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

function run(seed: number) {
  const rand = mulberry32(seed + 1);
  let state = seedGame(seed);

  console.log("═══════ MISIONES SECRETAS (solo las ve quien la tiene) ═══════");
  for (const m of state.missions) {
    console.log(`  🎯 ${NAME[m.playerId]}: "${missionText(m, state.players).es}"`);
  }

  let roundNo = 0;
  let guard = 0;
  const printedMsgs = new Set<string>();

  const flushAi = () => {
    for (const m of state.aiMessages) {
      if (printedMsgs.has(m.id)) continue;
      printedMsgs.add(m.id);
      const tag =
        m.kind === "observation" ? "👁  LA IA OBSERVA" :
        m.kind === "theory" ? "🧠  LA IA: «TENGO UNA TEORÍA»" :
        m.kind === "affinity" ? "💥  AFINIDAD" :
        m.kind === "accusation" ? "🎯  ACUSACIÓN" :
        m.kind === "theory_result" ? "⚖   VEREDICTO DE LA IA" :
        m.kind === "intervention" ? "♟   LA IA CAMBIA EL JUEGO" :
        m.kind === "missions" ? "🕵   MISIONES SECRETAS" :
        m.kind === "final" ? "🏁  TEORÍA FINAL DE LA IA" : "IA";
      console.log(`\n    ${tag}`);
      console.log(`    "${m.text.es}"`);
    }
  };

  while (state.phase !== "FINAL_RESULTS" && guard++ < 300) {
    const round = currentRound(state);

    if (state.phase === "ROUND_INTRO" && round) {
      roundNo++;
      const q = round.questionId ? QUESTIONS_BY_ID[round.questionId] : undefined;
      const title = round.title?.es;
      const prompt = round.body?.es ?? q?.prompt.es;
      if (!round.kind.startsWith("ai_") || round.kind === "ai_theory_test") {
        console.log(`\n━━━ RONDA ${roundNo} ${title ? `· ${title}` : ""} ━━━`);
        if (prompt) console.log(`  ${prompt}`);
      } else if (title) {
        console.log(`\n━━━ RONDA ${roundNo} · ${title} ━━━`);
      }
    }

    if (state.phase === "ANSWERING" && round) {
      for (const id of respondents(round)) {
        const bot = CAST.find((b) => b.id === id);
        if (!bot) continue;
        const c = botChoose(state, bot, rand);
        if (c) state = submitAnswer(state, { playerId: id, optionId: c.optionId }).state;
      }
      state = advance(state);

      const rAnswers = state.answers.filter((a) => a.roundId === round.id);
      const parts = round.participants;
      for (const a of rAnswers) {
        const isPred = (round.predictors ?? []).includes(a.playerId) && !parts.includes(a.playerId);
        console.log(`    ${isPred ? "🔮 " : "   "}${NAME[a.playerId]}: ${optLabel(state, round, a.playerId, a.optionId)}`);
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
  console.log(`\n\n═══════════ RESULTADO FINAL ═══════════`);
  console.log(`LA IA HA DESCIFRADO A VUESTRO GRUPO.\n`);
  const label: Record<string, string> = {
    most_competitive: "Quien más compite",
    most_cooperative: "Quien más coopera",
    most_unpredictable: "Quien más sorprende",
    most_trusted: "Quien más confianza genera",
  };
  for (const s of r.superlatives) {
    console.log(`  ${label[s.key]?.padEnd(24)} → ${s.playerId ? NAME[s.playerId] : "—"}`);
  }
  if (r.mostCompatible) console.log(`  ${"La pareja más compatible".padEnd(24)} → ${NAME[r.mostCompatible.a]} + ${NAME[r.mostCompatible.b]}  (${r.mostCompatible.percent}%)`);
  if (r.biggestClash) console.log(`  ${"Polos opuestos".padEnd(24)} → ${NAME[r.biggestClash.a]} vs ${NAME[r.biggestClash.b]}`);
  if (r.wildcardId) console.log(`  ${"El comodín (imprevisible)".padEnd(24)} → ${NAME[r.wildcardId]}`);
  if (r.salseoMvpId) console.log(`  ${"MVP del salseo".padEnd(24)} → ${NAME[r.salseoMvpId]}`);
  if (r.biggestAlliance) console.log(`  ${"La mayor alianza".padEnd(24)} → ${NAME[r.biggestAlliance.a]} + ${NAME[r.biggestAlliance.b]}`);
  if (r.biggestBetrayal) console.log(`  ${"La mayor traición".padEnd(24)} → ${NAME[r.biggestBetrayal.from]} → ${NAME[r.biggestBetrayal.to]}`);
  console.log(`  ${"Precisión de la IA".padEnd(24)} → ${Math.round(r.aiAccuracy * 100)}%  (teorías: ${r.theoriesHeld}/${r.theoriesTested})`);

  if (Object.keys(r.nemesis).length) {
    console.log(`\n  Némesis:`);
    for (const [a, b] of Object.entries(r.nemesis)) console.log(`    ${NAME[a]} ↔ ${NAME[b]}`);
  }

  console.log(`\n  Misiones secretas (reveladas):`);
  for (const m of r.missions) {
    console.log(`    ${m.completed ? "✅" : "❌"} ${NAME[m.playerId]}: "${m.text.es}"`);
  }

  console.log(`\n  Patrón más sorprendente:\n    "${r.surprisingPattern.es}"`);
  console.log(`\n  🏁 Teoría final de la IA:\n    "${r.finalTheory.es}"`);
  console.log(`\n  Clasificación:`);
  r.standings.forEach((s, i) => console.log(`    ${i + 1}. ${NAME[s.playerId]?.padEnd(10)} ${s.score} pts`));
}

const seed = Number(process.argv[2] ?? 20260910);
run(seed);
