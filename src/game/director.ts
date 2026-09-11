import { topReadings } from "./behavior";
import { pairMetrics, getEdge } from "./group";
import { allCompatibility } from "./compat";
import { chooseQuestion, makeRound, playerOptions, rngFor } from "./selector";
import {
  ACCUSATIONS,
  GENERIC_ACCUSATIONS,
  DEAL_TASKS,
  MOVEMENT_STATEMENTS,
  PROPHECIES,
  WARMUP_FOCUS,
  consequenceOptions,
  dealChoiceOptions,
  movementOptions,
  prophecyBetOptions,
} from "./directorContent";
import { hashString, pick, shuffle } from "@/lib/rng";
import type {
  DirectorMove,
  DirectorSignal,
  GameState,
  Localized,
  Player,
  Round,
} from "./types";

// ─────────────────────────────────────────────────────────────
// THE DIRECTOR — the AI game master.
//
// It is NOT a script. Every ~round it reads the room (deterministic
// signals from the behaviour + group + reputation models) and picks
// the move that best raises table tension without singling out the
// same person twice or breaking the group. Every move it makes is
// logged with a reason for the end-of-game confession.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

export function defaultTargetRounds(playerCount: number): number {
  return playerCount >= 6 ? 14 : 12;
}

function name(state: GameState, id: string): string {
  return state.players.find((p) => p.id === id)?.nickname ?? "?";
}

function connectedPlayers(state: GameState): Player[] {
  const c = state.players.filter((p) => p.connected);
  return c.length >= 3 ? c : state.players;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

// ---------- signal detection ----------

interface Signals {
  boredPlayer: string | null;
  runawayLeader: string | null;
  coziestPair: [string, string] | null;
  harmony: number; // 0..1
  lastTheoryFailed: boolean;
  grudge: { from: string; to: string } | null;
}

function readSignals(state: GameState): Signals {
  const players = connectedPlayers(state);
  const ids = players.map((p) => p.id);
  const round = state.rounds.length;

  // bored: least spotlight + lowest influence, connected
  let bored: { id: string; score: number } | null = null;
  for (const p of players) {
    const last = state.director.lastSpotlightRound[p.id] ?? -5;
    const sinceSpotlight = round - last;
    const score = sinceSpotlight * 1.5 - p.influence * 0.05 - p.spotlightCount * 2;
    if (!bored || score > bored.score) bored = { id: p.id, score };
  }

  // runaway leader
  const scores = players.map((p) => p.score);
  const med = median(scores);
  const leader = [...players].sort((a, b) => b.score - a.score)[0];
  const runaway = leader && leader.score - med > 220 ? leader.id : null;

  // coziest grounded pair
  const compat = allCompatibility(state).filter((c) => c.grounded);
  const cozy = compat[0] && compat[0].score > 0.62 ? ([compat[0].a, compat[0].b] as [string, string]) : null;

  // harmony = average pairwise alignment on comparable rounds
  const metrics = pairMetrics(state.group, ids).filter((m) => m.comparable >= 2);
  const harmony =
    metrics.length > 0 ? metrics.reduce((a, m) => a + m.alignmentRatio, 0) / metrics.length : 0.5;

  const lastTheory = [...state.theories].reverse().find((t) => t.status === "strengthened" || t.status === "discarded");
  const lastTheoryFailed = lastTheory?.status === "discarded";

  // grudge: the most recent betrayal
  let grudge: { from: string; to: string } | null = null;
  let best = 0;
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      const e = getEdge(state.group, from, to);
      if (e.betrayedCount > best) {
        best = e.betrayedCount;
        grudge = { from, to };
      }
    }
  }

  return {
    boredPlayer: bored?.id ?? null,
    runawayLeader: runaway,
    coziestPair: cozy,
    harmony,
    lastTheoryFailed,
    grudge,
  };
}

// ---------- the decision ----------

export interface DirectorResult {
  round: Round;
  move: DirectorMove;
}

export function buildDirectorRound(state: GameState): DirectorResult {
  const index = state.rounds.length;
  const total = state.targetRounds;
  const players = connectedPlayers(state);
  const ids = players.map((p) => p.id);
  const rand = rngFor(state, "dir" + index);
  const moveId = "d" + hashString("dir" + index + state.seed).toString(36);

  // ── WARM-UP: gather data quietly, no drama ──
  if (index < 3) {
    const focus = WARMUP_FOCUS[index % WARMUP_FOCUS.length]!;
    const kind = index === 1 ? "majority_minority" : index === 2 ? "compat_probe" : "individual";
    const q = chooseQuestion(state, kind, focus, "w" + index);
    return {
      round: makeRound({
        id: `r${index}`,
        index,
        kind,
        questionId: q.id,
        participants: ids,
        directorMoveId: moveId,
        title: kind === "compat_probe" ? L("Same answer?", "¿La misma respuesta?") : undefined,
      }),
      move: {
        id: moveId,
        roundIndex: index,
        kind,
        signal: "warmup",
        targets: [],
        reason: L("I stayed quiet and watched how you each play.", "Me quedé callada y observé cómo juega cada uno."),
      },
    };
  }

  const sig = readSignals(state);
  const beats = state.director.beats;
  const roundsLeft = total - index;
  const lastKind = state.rounds[state.rounds.length - 1]?.kind;
  const freshest = () => [...players].sort((a, b) => a.spotlightCount - b.spotlightCount)[0]!.id;

  // ── FINALE: the confrontation it's been building toward ──
  if (roundsLeft === 2) {
    // put the player the room trusts least (or the leader) on the spot, one last time
    const rivalry = pairMetrics(state.group, ids)
      .filter((m) => m.betrayal + m.accusationsExchanged > 0 || m.alignmentRatio < 0.4)
      .sort((a, b) => b.betrayal + b.accusationsExchanged - (a.betrayal + a.accusationsExchanged))[0];
    const target = rivalry
      ? (state.players.find((p) => p.id === rivalry.a)!.score <= state.players.find((p) => p.id === rivalry.b)!.score
          ? rivalry.a
          : rivalry.b)
      : [...players].sort((a, b) => b.suspicion - a.suspicion)[0]!.id;
    if (lastKind === "interrogation") {
      // avoid two in a row — make it a public prophecy about the same person instead
      return prophecy(state, index, moveId, target, "finale", rand);
    }
    return interrogation(state, index, moveId, target, "finale", rand);
  }
  if (roundsLeft === 1) {
    return movement(state, index, moveId, "finale", rand);
  }

  // ── MID GAME: pick the mechanic that's most "behind" its target mix,
  //    weighted by which signals are hot. Never the same kind twice in a row. ──
  const midTotal = Math.max(1, total - 5); // rounds that aren't warmup / finale
  const soFar = Math.max(1, index - 3);
  const desired: Record<string, number> = {
    interrogation: 0.28,
    deal: 0.16,
    prophecy: 0.18,
    movement: 0.18,
    filler: 0.2,
  };
  void midTotal;

  type Opt = {
    kind: "interrogation" | "deal" | "prophecy" | "movement" | "filler";
    signal: DirectorSignal;
    boost: number;
    build: () => DirectorResult;
  };
  const opts: Opt[] = [];

  // interrogation — pick the target from the hottest reason
  {
    let target = sig.boredPlayer;
    let signal: DirectorSignal = "bored_player";
    let boost = 0.15;
    if (sig.grudge) { target = sig.grudge.from; signal = "grudge"; boost = 0.5; }
    else if (sig.runawayLeader) { target = sig.runawayLeader; signal = "runaway_leader"; boost = 0.4; }
    if (target) {
      opts.push({ kind: "interrogation", signal, boost, build: () => interrogation(state, index, moveId, target!, signal, rand) });
    }
  }
  // deal — only when a pair is genuinely cozy, and space them out
  if (sig.coziestPair && lastKind !== "deal") {
    opts.push({
      kind: "deal",
      signal: "cozy_pair",
      boost: 0.35,
      build: () => deal(state, index, moveId, sig.coziestPair!, "cozy_pair", rand),
    });
  }
  // prophecy
  opts.push({
    kind: "prophecy",
    signal: sig.lastTheoryFailed ? "theory_failed" : "cadence",
    boost: sig.lastTheoryFailed ? 0.3 : 0.1,
    build: () => prophecy(state, index, moveId, freshest(), sig.lastTheoryFailed ? "theory_failed" : "cadence", rand),
  });
  // movement
  opts.push({
    kind: "movement",
    signal: sig.harmony > 0.7 ? "too_much_harmony" : "cadence",
    boost: sig.harmony > 0.7 ? 0.35 : 0.1,
    build: () => movement(state, index, moveId, sig.harmony > 0.7 ? "too_much_harmony" : "cadence", rand),
  });
  // filler — a clean contested vote
  opts.push({
    kind: "filler",
    signal: "cadence",
    boost: 0,
    build: () => {
      const q = chooseQuestion(state, "majority_minority", ["risk", "conformity", "contrarianism"], "m" + index);
      return {
        round: makeRound({ id: `r${index}`, index, kind: "majority_minority", questionId: q.id, participants: ids, directorMoveId: moveId }),
        move: {
          id: moveId, roundIndex: index, kind: "majority_minority", signal: "cadence", targets: [],
          reason: L("I put a clean split in front of you to see who breaks.", "Os puse una división limpia delante para ver quién rompe."),
        },
      };
    },
  });

  let best: Opt | null = null;
  let bestScore = -Infinity;
  for (const o of opts) {
    const used = (beats[o.kind] ?? 0) / soFar;
    const deficit = desired[o.kind]! - used; // positive => under-used
    let score = deficit * 3 + o.boost + rand() * 0.25;
    if ((lastKind === "interrogation" && o.kind === "interrogation") || (lastKind === "movement" && o.kind === "movement")) {
      score -= 2; // no repeats back to back
    }
    if (score > bestScore) { bestScore = score; best = o; }
  }
  return best!.build();
}

// ---------- mechanic builders ----------

function spotlightReason(signal: DirectorSignal, n: string): Localized {
  switch (signal) {
    case "bored_player":
      return L(`${n} had gone quiet, so I put them in the middle of the room.`, `${n} se había apagado, así que le puse en el centro de la sala.`);
    case "runaway_leader":
      return L(`${n} was pulling ahead, so I turned the room on them.`, `${n} se estaba escapando, así que puse a la sala en su contra.`);
    case "grudge":
      return L(`${n} had betrayed someone, so I made them answer for it out loud.`, `${n} había traicionado a alguien, así que le hice responder por ello en voz alta.`);
    case "finale":
      return L(`I saved the biggest confrontation for ${n}.`, `Me guardé la confrontación más grande para ${n}.`);
    default:
      return L(`I put ${n} on the spot.`, `Puse a ${n} en el punto de mira.`);
  }
}

function interrogation(
  state: GameState,
  index: number,
  moveId: string,
  targetId: string,
  signal: DirectorSignal,
  rand: () => number,
): DirectorResult {
  const n = name(state, targetId);
  const prof = state.behavior[targetId];
  const readings = prof ? topReadings(prof, { minConfidence: 0.35, minEvidence: 2, limit: 4 }) : [];

  let line: Localized | null = null;
  for (const acc of shuffle(rand, ACCUSATIONS)) {
    const r = readings.find((x) => x.dimension === acc.dimension);
    if (r && (acc.high ? r.polarity > 0.25 : r.polarity < -0.25)) {
      line = acc.line(n);
      break;
    }
  }
  if (!line) line = pick(rand, GENERIC_ACCUSATIONS)(n);

  const others = state.players.map((p) => p.id).filter((x) => x !== targetId);
  const rating = [
    { id: "1", label: L("Not buying it", "No me lo trago"), tags: {} as Record<string, number> },
    { id: "2", label: L("Meh", "Meh"), tags: {} },
    { id: "3", label: L("Fair enough", "Vale, cuela"), tags: {} },
    { id: "4", label: L("Convincing", "Convincente"), tags: {} },
    { id: "5", label: L("Completely sold", "Totalmente convencido"), tags: {} },
  ];

  return {
    round: makeRound({
      id: `r${index}`,
      index,
      kind: "interrogation",
      participants: others, // the room rates; the target just talks
      hotSeatId: targetId,
      directorMoveId: moveId,
      title: L("The interrogation", "El interrogatorio"),
      body: line,
      talkSeconds: 45,
      talkPrompt: L(`${n} — defend yourself. Everyone else: judge.`, `${n} — defiéndete. El resto: juzgad.`),
      stageInstruction: L(`${n} stands. 45 seconds to talk.`, `${n} se levanta. 45 segundos para hablar.`),
      optionsByPlayer: Object.fromEntries(others.map((o) => [o, rating])),
      consequenceOptions: consequenceOptions(n),
      timeLimit: 25,
    }),
    move: {
      id: moveId,
      roundIndex: index,
      kind: "interrogation",
      signal,
      targets: [targetId],
      reason: spotlightReason(signal, n),
    },
  };
}

function deal(
  state: GameState,
  index: number,
  moveId: string,
  pair: [string, string],
  signal: DirectorSignal,
  rand: () => number,
): DirectorResult {
  const [p1, p2] = pair;
  const task = pick(rand, DEAL_TASKS);
  const others = state.players.map((p) => p.id).filter((x) => x !== p1 && x !== p2);
  const choice = dealChoiceOptions();

  // the two dealmakers get the secret choice; everyone hunts for the tell afterwards
  const optionsByPlayer: Record<string, typeof choice> = { [p1]: choice, [p2]: choice };
  // everyone (incl. dealmakers) will also point at who they think had a deal — built as a
  // player-target sub-vote handled at reveal via `predictors`; here we just collect the choice.

  return {
    round: makeRound({
      id: `r${index}`,
      index,
      kind: "deal",
      participants: [p1, p2],
      predictors: others,
      directorMoveId: moveId,
      title: L("The deal", "El trato"),
      body: L(
        "Two of you got a secret message. Everyone else: watch for the tell.",
        "Dos de vosotros habéis recibido un mensaje secreto. El resto: buscad el tell.",
      ),
      talkSeconds: 40,
      talkPrompt: L("Talk normally. Act natural. Someone here is lying.", "Hablad con normalidad. Actuad natural. Alguien está mintiendo."),
      secretDeal: { players: pair, reward: task.reward, task: task.task },
      optionsByPlayer: {
        ...optionsByPlayer,
        // predictors point at up to two players
        ...Object.fromEntries(
          others.map((o) => [
            o,
            playerOptions(state.players.filter((p) => p.connected), [o]),
          ]),
        ),
      },
      timeLimit: 22,
    }),
    move: {
      id: moveId,
      roundIndex: index,
      kind: "deal",
      signal,
      targets: pair,
      reason: L(
        `${name(state, p1)} and ${name(state, p2)} were getting too comfortable, so I offered one of them a reason to turn.`,
        `${name(state, p1)} y ${name(state, p2)} se estaban acomodando demasiado, así que le ofrecí a uno un motivo para girarse.`,
      ),
    },
  };
}

function prophecy(
  state: GameState,
  index: number,
  moveId: string,
  subjectId: string,
  signal: DirectorSignal,
  rand: () => number,
): DirectorResult {
  const n = name(state, subjectId);
  const prof = state.behavior[subjectId];
  const spec = pick(rand, PROPHECIES);
  // predict from data: does this player usually go bold?
  const bold =
    (prof?.risk.value ?? 0.5) > 0.55 ||
    (prof?.contrarianism.value ?? 0.5) > 0.55 ||
    (prof?.loyalty.value ?? 0.5) < 0.4;
  const predictedOptionId = bold ? "B" : "A";
  const others = state.players.map((p) => p.id).filter((x) => x !== subjectId);

  return {
    round: makeRound({
      id: `r${index}`,
      index,
      kind: "prophecy",
      participants: [subjectId],
      predictors: others,
      hotSeatId: subjectId,
      directorMoveId: moveId,
      title: L("The prophecy", "La profecía"),
      body: spec.prompt,
      prophecy: { subjectId, predictedOptionId, label: spec.call(n, bold) },
      talkSeconds: 20,
      talkPrompt: spec.call(n, bold),
      stageInstruction: L(`I've called it. ${n}, prove me right or make me look stupid.`, `Ya lo he dicho. ${n}, dame la razón o hazme quedar mal.`),
      optionsByPlayer: {
        [subjectId]: spec.options,
        ...Object.fromEntries(others.map((o) => [o, prophecyBetOptions()])),
      },
      timeLimit: 20,
    }),
    move: {
      id: moveId,
      roundIndex: index,
      kind: "prophecy",
      signal,
      targets: [subjectId],
      reason: L(
        `I said out loud what I thought ${n} would do, to see if being watched would change it.`,
        `Dije en voz alta lo que creía que haría ${n}, para ver si sentirse observado lo cambiaba.`,
      ),
    },
  };
}

function movement(
  state: GameState,
  index: number,
  moveId: string,
  signal: DirectorSignal,
  rand: () => number,
): DirectorResult {
  const ids = connectedPlayers(state).map((p) => p.id);
  const usedStatements = state.rounds
    .filter((r) => r.kind === "movement")
    .map((r) => r.body?.en);
  const pool = MOVEMENT_STATEMENTS.filter((s) => !usedStatements.includes(s.en));
  const statement = pick(rand, pool.length ? pool : MOVEMENT_STATEMENTS);

  return {
    round: makeRound({
      id: `r${index}`,
      index,
      kind: "movement",
      participants: ids,
      directorMoveId: moveId,
      liveTally: true,
      title: L("On your feet", "En pie"),
      body: statement,
      stageInstruction: L(
        "Everyone stand. Move LEFT if it's true for you, RIGHT if not.",
        "Todos en pie. IZQUIERDA si es verdad para ti, DERECHA si no.",
      ),
      talkSeconds: 15,
      talkPrompt: L(
        "Read it out loud. Stand up. Take your side — then lock it in on your phone.",
        "Leedlo en voz alta. Poneos de pie. Elegid vuestro lado — luego bloqueadlo en el móvil.",
      ),
      optionsByPlayer: { "*": movementOptions() },
      timeLimit: 18,
    }),
    move: {
      id: moveId,
      roundIndex: index,
      kind: "movement",
      signal,
      targets: [],
      reason:
        signal === "too_much_harmony"
          ? L("You were agreeing too much, so I made you take a side where everyone could see it.", "Estabais de acuerdo en todo, así que os hice tomar partido donde todos lo vieran.")
          : L("I wanted the room on its feet, looking at each other.", "Quería a la sala de pie, mirándose a la cara."),
    },
  };
}

// ---------- director state bookkeeping ----------

export function noteSpotlight(state: GameState, move: DirectorMove): GameState {
  const lastSpotlightRound = { ...state.director.lastSpotlightRound };
  for (const t of move.targets) lastSpotlightRound[t] = move.roundIndex;
  const beats = { ...state.director.beats };
  const beatKey = ["prophecy", "movement", "deal", "interrogation"].includes(move.kind)
    ? move.kind
    : move.signal === "warmup"
      ? "warmup"
      : "filler";
  beats[beatKey] = (beats[beatKey] ?? 0) + 1;
  const players = state.players.map((p) =>
    move.targets.includes(p.id) ? { ...p, spotlightCount: p.spotlightCount + 1 } : p,
  );
  return {
    ...state,
    players,
    director: { ...state.director, lastSpotlightRound, beats },
    directorLog: [...state.directorLog, move],
  };
}
