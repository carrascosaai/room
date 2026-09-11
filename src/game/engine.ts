import { applyChoice, emptyProfile, topReadings } from "./behavior";
import {
  accusationText,
  affinityResultText,
  affinityText,
  dealRevealText,
  hotSeatVerdictText,
  missionsRevealText,
  movementText,
  observationText,
  prophecyResultText,
  theoryAnnounceText,
  theoryResultText,
} from "./commentary";
import { QUESTIONS_BY_ID } from "./questions";
import { buildFinalReport } from "./report";
import {
  concentration,
  emptyGroupModel,
  recordAccusation,
  recordAlignment,
  recordDilemma,
  recordPrediction,
  recordProtection,
  recordSelection,
  recordTasteMatch,
  setVoteConcentration,
} from "./group";
import { assignMissions, evaluateMissions } from "./missions";
import {
  buildDirectorRound,
  defaultTargetRounds,
  noteSpotlight,
} from "./director";
import { scoreDilemma, scoreMajorityMinority, POINTS } from "./scoring";
import { buildRoundForSlot, DEFAULT_PLAN } from "./selector";
import { resolveTheory } from "./theories";
import { hashString } from "@/lib/rng";
import type {
  AiMessage,
  Answer,
  GameMode,
  GameState,
  Lang,
  Localized,
  Player,
  Round,
  RoundOutcome,
  Theory,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Server-authoritative state machine. Pure functions: each takes
// a GameState and returns a NEW GameState. The store persists it,
// realtime pushes it, clients render it.
// ─────────────────────────────────────────────────────────────

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const DISCONNECT_GRACE_MS = 45_000;

const L = (en: string, es: string): Localized => ({ en, es });

function bump(s: GameState): GameState {
  return { ...s, version: s.version + 1 };
}

function now(): number {
  return Date.now();
}

// ---------- creation & lobby ----------

export function freshPlayer(
  p: { id: string; nickname: string; lang: Lang },
  isHost: boolean,
  t: number = Date.now(),
): Player {
  return {
    id: p.id,
    nickname: p.nickname.trim().slice(0, 20) || "Player",
    lang: p.lang,
    isHost,
    connected: true,
    joinedAt: t,
    lastSeen: t,
    score: 0,
    trust: 50,
    suspicion: 50,
    influence: 50,
    spotlightCount: 0,
  };
}

export function createGame(
  code: string,
  host: { id: string; nickname: string; lang: Lang },
  mode: GameMode = "director",
): GameState {
  const t = now();
  return {
    code,
    phase: "LOBBY",
    mode,
    createdAt: t,
    players: [freshPlayer(host, true, t)],
    hostId: host.id,
    plan: DEFAULT_PLAN,
    targetRounds: 12,
    rounds: [],
    currentRoundIndex: -1,
    answers: [],
    behavior: {},
    group: emptyGroupModel(),
    theories: [],
    missions: [],
    director: { lastSpotlightRound: {}, beats: {} },
    directorLog: [],
    outcomes: [],
    aiMessages: [],
    version: 1,
    seed: hashString(code + t) >>> 0,
    usedQuestionIds: [],
  };
}

export function addPlayer(
  s: GameState,
  p: { id: string; nickname: string; lang: Lang },
): { state: GameState; error?: string } {
  if (s.players.some((x) => x.id === p.id)) {
    return { state: setConnected(s, p.id, true) };
  }
  if (s.phase !== "LOBBY") {
    // late join — allowed as spectator-ish player only before it gets awkward
    if (s.players.length >= MAX_PLAYERS) return { state: s, error: "room_full" };
  }
  if (s.players.length >= MAX_PLAYERS) return { state: s, error: "room_full" };
  const nickname = p.nickname.trim().slice(0, 20) || "Player";
  if (s.players.some((x) => x.nickname.toLowerCase() === nickname.toLowerCase())) {
    return { state: s, error: "nickname_taken" };
  }
  const t = now();
  const player = freshPlayer({ ...p, nickname }, false, t);
  const next: GameState = { ...s, players: [...s.players, player] };
  if (s.phase !== "LOBBY") next.behavior[p.id] = emptyProfile();
  return { state: bump(next) };
}

export function setConnected(s: GameState, playerId: string, connected: boolean): GameState {
  const players = s.players.map((p) =>
    p.id === playerId ? { ...p, connected, lastSeen: now() } : p,
  );
  return bump({ ...s, players });
}

export function heartbeat(s: GameState, playerId: string): GameState {
  const players = s.players.map((p) =>
    p.id === playerId ? { ...p, connected: true, lastSeen: now() } : p,
  );
  return { ...s, players }; // no version bump — heartbeats are cheap
}

export function setLanguage(s: GameState, playerId: string, lang: Lang): GameState {
  const players = s.players.map((p) => (p.id === playerId ? { ...p, lang } : p));
  return bump({ ...s, players });
}

export function removePlayer(s: GameState, playerId: string): GameState {
  const players = s.players.filter((p) => p.id !== playerId);
  if (players.length === 0) return bump({ ...s, players });
  let hostId = s.hostId;
  if (hostId === playerId) {
    const nextHost = [...players].sort((a, b) => a.joinedAt - b.joinedAt)[0]!;
    hostId = nextHost.id;
  }
  return bump({
    ...s,
    players: players.map((p) => ({ ...p, isHost: p.id === hostId })),
    hostId,
  });
}

/** Called on each poll/heartbeat sweep to drop stale hosts. */
export function reconcilePresence(s: GameState): GameState {
  const t = now();
  let changed = false;
  const players = s.players.map((p) => {
    if (p.connected && t - p.lastSeen > DISCONNECT_GRACE_MS) {
      changed = true;
      return { ...p, connected: false };
    }
    return p;
  });
  let next = { ...s, players };
  const host = players.find((p) => p.id === s.hostId);
  if (host && !host.connected) {
    const candidate = players
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (candidate) {
      changed = true;
      next = {
        ...next,
        hostId: candidate.id,
        players: players.map((p) => ({ ...p, isHost: p.id === candidate.id })),
      };
    }
  }
  return changed ? bump(next) : s;
}

// ---------- start ----------

export function startGame(s: GameState): { state: GameState; error?: string } {
  if (s.phase !== "LOBBY") return { state: s, error: "already_started" };
  const active = s.players.filter((p) => p.connected);
  if (active.length < MIN_PLAYERS) return { state: s, error: "not_enough_players" };

  const behavior: Record<string, ReturnType<typeof emptyProfile>> = {};
  for (const p of s.players) behavior[p.id] = emptyProfile();

  let next: GameState = {
    ...s,
    phase: "ROUND_INTRO",
    startedAt: now(),
    behavior,
    missions: assignMissions(s.players, s.seed),
    targetRounds: s.mode === "director" ? defaultTargetRounds(s.players.length) : s.plan.length,
    currentRoundIndex: 0,
    phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_INTRO!,
  };

  if (s.mode === "director") {
    const { round, move } = buildDirectorRound(next);
    next = noteSpotlight(next, move);
    next = {
      ...next,
      rounds: [round],
      usedQuestionIds: round.questionId ? [round.questionId] : [],
    };
  } else {
    const build = buildRoundForSlot(next, 0);
    next = {
      ...next,
      rounds: [build.round],
      theories: build.theoryPatch ? [...next.theories, ...build.theoryPatch] : next.theories,
      usedQuestionIds: build.round.questionId ? [build.round.questionId] : [],
    };
  }
  return { state: bump(next) };
}

export function totalRounds(s: GameState): number {
  return s.mode === "director" ? s.targetRounds : s.plan.length;
}

// ---------- answers ----------

export function currentRound(s: GameState): Round | undefined {
  return s.rounds[s.currentRoundIndex];
}

export function optionsForPlayer(round: Round, playerId: string): { id: string; label: Localized }[] {
  if (round.optionsByPlayer) {
    const specific = round.optionsByPlayer[playerId] ?? round.optionsByPlayer["*"];
    if (specific) return specific.map((o) => ({ id: o.id, label: o.label }));
  }
  if (round.questionId) {
    const q = QUESTIONS_BY_ID[round.questionId];
    if (q) return q.options.map((o) => ({ id: o.id, label: o.label }));
  }
  return [];
}

/** who is expected to answer this round (participants + predictors) */
export function respondents(round: Round): string[] {
  return [...new Set([...(round.participants ?? []), ...(round.predictors ?? [])])];
}

export function submitAnswer(
  s: GameState,
  input: { playerId: string; optionId: string; targetId?: string },
): { state: GameState; error?: string } {
  if (s.phase !== "ANSWERING") return { state: s, error: "not_answering" };
  const round = currentRound(s);
  if (!round) return { state: s, error: "no_round" };
  const allowed = respondents(round);
  if (!allowed.includes(input.playerId)) return { state: s, error: "not_a_respondent" };
  if (s.answers.some((a) => a.roundId === round.id && a.playerId === input.playerId)) {
    return { state: s, error: "already_answered" };
  }
  const validOptions = optionsForPlayer(round, input.playerId).map((o) => o.id);
  if (!validOptions.includes(input.optionId)) return { state: s, error: "invalid_option" };

  const answer: Answer = {
    roundId: round.id,
    playerId: input.playerId,
    optionId: input.optionId,
    targetId: input.targetId,
    at: now(),
  };
  return { state: bump({ ...s, answers: [...s.answers, answer] }) };
}

export function allAnswered(s: GameState): boolean {
  const round = currentRound(s);
  if (!round) return false;
  const need = respondents(round).filter((id) => {
    const p = s.players.find((x) => x.id === id);
    return p?.connected;
  });
  const have = new Set(
    s.answers.filter((a) => a.roundId === round.id).map((a) => a.playerId),
  );
  return need.every((id) => have.has(id));
}

// ---------- the reducer ----------

/** Minimum time a display phase stays on screen before anyone can skip it. */
export const MIN_DISPLAY_MS: Record<string, number> = {
  ROUND_INTRO: 4000,
  REVEAL: 6000,
  ROUND_RESULT: 7000,
  AI_OBSERVATION: 9000,
  AI_THEORY: 9000,
  AI_INTERVENTION: 8000,
};

export function advance(s: GameState): GameState {
  switch (s.phase) {
    case "LOBBY":
    case "FINAL_RESULTS":
      return s;

    case "ROUND_INTRO":
      return enterFromIntro(s);

    case "DISCUSSION":
      return bump({
        ...s,
        phase: "ANSWERING",
        phaseDeadline: now() + (currentRound(s)?.timeLimit ?? 20) * 1000,
      });

    case "ANSWERING":
      return doReveal(s);

    case "REVEAL":
      return bump({
        ...s,
        phase: "ROUND_RESULT",
        phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_RESULT!,
      });

    case "AI_INTERVENTION":
      // interventions are interactive; this state is only the framing screen
      return bump({
        ...s,
        phase: "ANSWERING",
        phaseDeadline: now() + (currentRound(s)?.timeLimit ?? 20) * 1000,
      });

    case "AI_OBSERVATION":
    case "AI_THEORY":
    case "ROUND_RESULT":
      return nextRound(s);

    default:
      return s;
  }
}

function enterFromIntro(s: GameState): GameState {
  const round = currentRound(s);
  if (!round) return nextRound(s);

  if (round.kind === "ai_observation") {
    const { text } = observationText(s, s.plan[round.index]?.type === "final_slot");
    const msg = aiMessage(s, "observation", text, round.index);
    const rounds = s.rounds.map((r) => (r.id === round.id ? { ...r, body: text } : r));
    return bump({
      ...s,
      phase: "AI_OBSERVATION",
      phaseDeadline: now() + MIN_DISPLAY_MS.AI_OBSERVATION!,
      rounds,
      aiMessages: [...s.aiMessages, msg],
    });
  }

  if (round.kind === "ai_theory") {
    const theory = s.theories.find((t) => t.id === round.theoryId);
    const text = theory
      ? theoryAnnounceText(theory, s.players)
      : L("I have a theory. Let me test it.", "Tengo una teoría. Voy a ponerla a prueba.");
    const isAff = theory?.type === "high_compatibility" || theory?.type === "clashing_values";
    const msg = aiMessage(s, isAff ? "affinity" : "theory", text, round.index);
    const theories = s.theories.map((t) =>
      t.id === round.theoryId ? { ...t, status: "testing" as const } : t,
    );
    return bump({
      ...s,
      phase: "AI_THEORY",
      phaseDeadline: now() + MIN_DISPLAY_MS.AI_THEORY!,
      theories,
      aiMessages: [...s.aiMessages, msg],
      rounds: s.rounds.map((r) => (r.id === round.id ? { ...r, body: text } : r)),
    });
  }

  if (round.kind === "ai_intervention") {
    const msg = aiMessage(
      s,
      "intervention",
      round.body ?? L("I'm changing the game.", "Voy a cambiar el juego."),
      round.index,
    );
    return bump({
      ...s,
      phase: "AI_INTERVENTION",
      phaseDeadline: now() + MIN_DISPLAY_MS.AI_INTERVENTION!,
      aiMessages: [...s.aiMessages, msg],
    });
  }

  let extra: Partial<GameState> = {};
  const msgs: AiMessage[] = [];

  // affinity slot: an ai_theory_test that carries its own just-announced theory
  if (round.kind === "ai_theory_test" && round.theoryId) {
    const theory = s.theories.find((t) => t.id === round.theoryId);
    if (theory && theory.status === "announced") {
      const isAffinity = theory.type === "high_compatibility" || theory.type === "clashing_values";
      const text = isAffinity ? affinityText(theory, s.players) : theoryAnnounceText(theory, s.players);
      msgs.push(aiMessage(s, isAffinity ? "affinity" : "theory", text, round.index));
      extra = {
        theories: s.theories.map((t) => (t.id === theory.id ? { ...t, status: "testing" as const } : t)),
      };
    }
  }

  // director mechanics: push the framing line for the stage
  if (round.kind === "interrogation" && round.body) {
    msgs.push(aiMessage(s, "hot_seat", round.body, round.index));
  }
  if (round.kind === "prophecy" && round.prophecy) {
    msgs.push(aiMessage(s, "prophecy", round.prophecy.label, round.index));
  }
  if (round.kind === "deal" && round.body) {
    msgs.push(aiMessage(s, "quip", round.body, round.index));
  }
  if (round.kind === "movement" && round.stageInstruction) {
    msgs.push(aiMessage(s, "movement", round.stageInstruction, round.index));
  }

  const next = { ...s, ...extra, aiMessages: [...s.aiMessages, ...msgs] };

  // rounds with an out-loud talk window go through DISCUSSION first
  if (round.talkSeconds && round.talkSeconds > 0) {
    return bump({
      ...next,
      phase: "DISCUSSION",
      phaseDeadline: now() + round.talkSeconds * 1000,
    });
  }

  return bump({
    ...next,
    phase: "ANSWERING",
    phaseDeadline: round.timeLimit > 0 ? now() + round.timeLimit * 1000 : undefined,
  });
}

function aiMessage(
  s: GameState,
  kind: AiMessage["kind"],
  text: Localized,
  roundIndex: number,
): AiMessage {
  return {
    id: "m_" + hashString(kind + roundIndex + text.en + s.version).toString(36),
    kind,
    text,
    roundIndex,
    at: now(),
  };
}

// ---------- reveal / outcome ----------

function optionTags(questionId: string | undefined, optionId: string) {
  if (!questionId) return {};
  const q = QUESTIONS_BY_ID[questionId];
  return q?.options.find((o) => o.id === optionId)?.tags ?? {};
}

function roundOptionTags(round: Round, playerId: string, optionId: string) {
  if (round.optionsByPlayer) {
    const opts = round.optionsByPlayer[playerId] ?? round.optionsByPlayer["*"];
    const found = opts?.find((o) => o.id === optionId);
    if (found) return found.tags;
  }
  return optionTags(round.questionId, optionId);
}

function doReveal(s: GameState): GameState {
  const round = currentRound(s);
  if (!round) return nextRound(s);
  const roundAnswers = s.answers.filter((a) => a.roundId === round.id);
  const answerOf = (pid: string) => roundAnswers.find((a) => a.playerId === pid);

  let behavior = { ...s.behavior };
  let group = s.group;
  let theories = [...s.theories];
  const scoreDelta: Record<string, number> = {};
  const lines: Localized[] = [];
  const aiMsgs: AiMessage[] = [];
  let majorityOptionId: string | undefined;
  let contrarians: string[] | undefined;

  const repDelta: Record<string, { trust: number; suspicion: number; influence: number }> = {};
  const nameOf = (id: string) => s.players.find((p) => p.id === id)?.nickname ?? "?";
  const add = (id: string, n: number) => {
    scoreDelta[id] = (scoreDelta[id] ?? 0) + n;
  };
  const rep = (id: string, f: "trust" | "suspicion" | "influence", n: number) => {
    repDelta[id] ??= { trust: 0, suspicion: 0, influence: 0 };
    repDelta[id]![f] += n;
  };

  // participation points
  for (const a of roundAnswers) add(a.playerId, POINTS.answered);

  // --- behavior updates from tags (participants only; predictions carry no tags) ---
  for (const a of roundAnswers) {
    if (round.predictors?.includes(a.playerId) && !round.participants.includes(a.playerId)) continue;
    const tags = roundOptionTags(round, a.playerId, a.optionId);
    if (Object.keys(tags).length > 0 && behavior[a.playerId]) {
      behavior = { ...behavior, [a.playerId]: applyChoice(behavior[a.playerId]!, tags) };
    }
  }

  // --- per-kind resolution ---
  if (round.kind === "compat_probe") {
    // pair up everyone who gave the same answer
    const byOption = new Map<string, string[]>();
    for (const a of roundAnswers) {
      const arr = byOption.get(a.optionId) ?? [];
      arr.push(a.playerId);
      byOption.set(a.optionId, arr);
    }
    let matchedPairs = 0;
    for (const group_ of byOption.values()) {
      for (let i = 0; i < group_.length; i++) {
        for (let j = i + 1; j < group_.length; j++) {
          group = recordTasteMatch(group, group_[i]!, group_[j]!);
          matchedPairs++;
        }
      }
    }
    recordPairAlignment(roundAnswers, (a, b, matched) => {
      group = recordAlignment(group, a, b, matched);
    });
    // small reward for the rarer answer (being distinctive) and for matching
    const sizes = [...byOption.values()].map((g) => g.length);
    const biggest = Math.max(0, ...sizes);
    for (const [opt, g] of byOption) {
      const isBig = g.length === biggest && sizes.filter((s2) => s2 === biggest).length === 1;
      for (const pid of g) add(pid, isBig ? POINTS.majorityBonus : POINTS.contrarianBonus);
      void opt;
    }
    if (matchedPairs > 0) {
      const pair = [...byOption.values()].find((g) => g.length >= 2);
      if (pair && pair.length === 2) {
        lines.push(
          L(
            `${nameOf(pair[0]!)} and ${nameOf(pair[1]!)} gave the exact same answer.`,
            `${nameOf(pair[0]!)} y ${nameOf(pair[1]!)} dieron exactamente la misma respuesta.`,
          ),
        );
      }
    } else {
      lines.push(L("Everyone answered differently.", "Cada uno respondió algo distinto."));
    }
  }

  if (round.kind === "accusation") {
    const tally = new Map<string, number>();
    for (const a of roundAnswers) {
      tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
      group = recordAccusation(group, a.playerId, a.optionId);
    }
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const tied = sorted.filter((e) => e[1] === (top?.[1] ?? 0)).length > 1;
    const targetId = tied ? null : (top?.[0] ?? null);
    const votes = top?.[1] ?? 0;
    // does the room's pick line up with the AI's read?
    let matchesData = false;
    if (targetId) {
      const prof = behavior[targetId];
      const readings = prof
        ? topReadings(prof, { minConfidence: 0.4, minEvidence: 2, limit: 3 })
        : [];
      const flagged = s.theories.some(
        (t) => t.players.includes(targetId) && t.status !== "forming",
      );
      matchesData = flagged || readings.length > 0;
      lines.push(
        L(
          `The room pointed at ${nameOf(targetId)} (${votes}/${roundAnswers.length}).`,
          `La sala señaló a ${nameOf(targetId)} (${votes}/${roundAnswers.length}).`,
        ),
      );
      // reward everyone who voted with the room
      for (const a of roundAnswers) {
        if (a.optionId === targetId) add(a.playerId, POINTS.majorityBonus);
      }
    } else {
      lines.push(L("The room split. Nobody stood out.", "La sala se dividió. Nadie destacó."));
    }
    aiMsgs.push(
      aiMessage(
        s,
        "accusation",
        accusationText(targetId ? nameOf(targetId) : null, votes, roundAnswers.length, matchesData),
        round.index,
      ),
    );
  }

  if (round.kind === "individual") {
    const labelFor = (a: Answer) =>
      optionsFromRound(round, a.playerId).find((o) => o.id === a.optionId)?.label;
    const tally = new Map<string, number>();
    for (const a of roundAnswers) tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && round.questionId) {
      const q = QUESTIONS_BY_ID[round.questionId];
      const lbl = q?.options.find((o) => o.id === top[0])?.label;
      if (lbl) lines.push(L(`Most common: “${lbl.en}”`, `Lo más elegido: «${lbl.es}»`));
    }
    // odd-one-out flavour
    for (const [opt, count] of tally) {
      if (count === 1 && roundAnswers.length >= 4) {
        const loner = roundAnswers.find((a) => a.optionId === opt);
        if (loner) {
          const lbl = labelFor(loner);
          lines.push(
            L(
              `${nameOf(loner.playerId)} was the only one to pick ${lbl?.en ?? "that"}.`,
              `${nameOf(loner.playerId)} fue el único en elegir ${lbl?.es ?? "eso"}.`,
            ),
          );
        }
      }
    }
    // alignment tracking for group model
    recordPairAlignment(roundAnswers, (a, b, matched) => {
      group = recordAlignment(group, a, b, matched);
    });
  }

  if (round.kind === "majority_minority") {
    const res = scoreMajorityMinority(
      roundAnswers.map((a) => ({ playerId: a.playerId, optionId: a.optionId })),
    );
    majorityOptionId = res.majorityOptionId ?? undefined;
    contrarians = res.contrarians;
    for (const [id, d] of Object.entries(res.deltas)) add(id, d);
    if (majorityOptionId && round.questionId) {
      const q = QUESTIONS_BY_ID[round.questionId];
      const lbl = q?.options.find((o) => o.id === majorityOptionId)?.label;
      if (lbl) lines.push(L(`Majority: ${lbl.en}`, `Mayoría: ${lbl.es}`));
    }
    for (const c of res.contrarians) {
      lines.push(L(`${nameOf(c)} went against the room.`, `${nameOf(c)} fue contra la sala.`));
    }
    // Learn conformity / contrarianism from ACTUAL group behavior, not self-report.
    if (majorityOptionId) {
      for (const a of roundAnswers) {
        const withRoom = a.optionId === majorityOptionId;
        const prof = behavior[a.playerId];
        if (prof) {
          behavior = {
            ...behavior,
            [a.playerId]: applyChoice(prof, {
              conformity: withRoom ? 0.55 : -0.55,
              contrarianism: withRoom ? -0.55 : 0.55,
              socialAlignment: withRoom ? 0.4 : -0.4,
            }),
          };
        }
      }
    }
    recordPairAlignment(roundAnswers, (a, b, matched) => {
      group = recordAlignment(group, a, b, matched);
    });
  }

  if (round.kind === "group_vote" || round.kind === "trust") {
    const tally = new Map<string, number>();
    for (const a of roundAnswers) tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
    for (const a of roundAnswers) {
      group = recordSelection(group, a.playerId, a.optionId);
    }
    const counts = [...tally.values()];
    group = setVoteConcentration(group, round.id, concentration(counts));
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      add(top[0], POINTS.majorityBonus);
      lines.push(
        L(
          `${nameOf(top[0])} got the most votes (${top[1]}).`,
          `${nameOf(top[0])} se llevó más votos (${top[1]}).`,
        ),
      );
    }
    const gotNone = round.participants.filter((id) => !tally.has(id) && id !== undefined);
    if (gotNone.length === 1) {
      lines.push(L(`Nobody picked ${nameOf(gotNone[0]!)}.`, `Nadie eligió a ${nameOf(gotNone[0]!)}.`));
    }
  }

  if (round.kind === "social_dilemma" && round.pairs) {
    for (const [a, b] of round.pairs) {
      const aa = answerOf(a);
      const ba = answerOf(b);
      const aCoop = (aa?.optionId ?? "A") === "A";
      const bCoop = (ba?.optionId ?? "A") === "A";
      const deltas = scoreDilemma({ aId: a, bId: b, aCooperated: aCoop, bCooperated: bCoop });
      for (const [id, d] of Object.entries(deltas)) add(id, d);
      group = recordDilemma(group, a, b, aCoop, bCoop);
      if (aCoop && bCoop) {
        lines.push(L(`${nameOf(a)} & ${nameOf(b)} both cooperated.`, `${nameOf(a)} y ${nameOf(b)} cooperaron.`));
      } else if (!aCoop && !bCoop) {
        lines.push(L(`${nameOf(a)} & ${nameOf(b)} both betrayed.`, `${nameOf(a)} y ${nameOf(b)} se traicionaron.`));
      } else {
        const betrayer = !aCoop ? a : b;
        const victim = !aCoop ? b : a;
        lines.push(L(`${nameOf(betrayer)} betrayed ${nameOf(victim)}.`, `${nameOf(betrayer)} traicionó a ${nameOf(victim)}.`));
      }
    }
  }

  if (round.kind === "ai_theory_test" || round.kind === "ai_intervention") {
    const theory = round.theoryId ? theories.find((t) => t.id === round.theoryId) : undefined;

    // resolve the interactive core
    const selections: Record<string, string> = {};
    const choices: Record<string, string> = {};
    for (const pid of round.participants) {
      const a = answerOf(pid);
      if (!a) continue;
      const opts = optionsFromRound(round, pid);
      const isPlayerList = opts.some((o) => s.players.some((p) => p.id === o.id));
      if (isPlayerList) selections[pid] = a.optionId;
      else choices[pid] = a.optionId;
    }

    // dilemma-style pair
    if (round.pairs) {
      for (const [a, b] of round.pairs) {
        const aCoop = (choices[a] ?? "A") === "A";
        const bCoop = (choices[b] ?? "A") === "A";
        const deltas = scoreDilemma({ aId: a, bId: b, aCooperated: aCoop, bCooperated: bCoop });
        for (const [id, d] of Object.entries(deltas)) add(id, d);
        group = recordDilemma(group, a, b, aCoop, bCoop);
        if (!aCoop || !bCoop) {
          const who = !aCoop ? a : b;
          lines.push(L(`${nameOf(who)} broke it.`, `${nameOf(who)} la rompió.`));
        } else {
          lines.push(L(`${nameOf(a)} & ${nameOf(b)} held the line.`, `${nameOf(a)} y ${nameOf(b)} aguantaron.`));
        }
      }
    }

    // selection-style
    for (const [from, to] of Object.entries(selections)) {
      group = recordProtection(group, from, to);
      lines.push(L(`${nameOf(from)} chose ${nameOf(to)}.`, `${nameOf(from)} eligió a ${nameOf(to)}.`));
    }

    // predictions by non-participants
    let anyBetray = false;
    if (round.pairs) {
      anyBetray = round.pairs.some(([a, b]) => (choices[a] ?? "A") !== "A" || (choices[b] ?? "A") !== "A");
    }
    const isMatchTheory =
      theory?.type === "high_compatibility" || theory?.type === "clashing_values";
    const pairMatched =
      isMatchTheory && theory
        ? choices[theory.players[0]!] === choices[theory.players[1]!]
        : false;
    for (const pid of round.predictors ?? []) {
      const a = answerOf(pid);
      if (!a) continue;
      let correct = false;
      if (isMatchTheory) {
        // "yes" == they'll match again
        correct = (a.optionId === "yes") === pairMatched;
      } else if (round.pairs) {
        // option "B" == "someone betrays"
        correct = (a.optionId === "B") === anyBetray;
      } else if (Object.keys(selections).length && theory) {
        const [p1, p2] = theory.players;
        const actual = p1 ? selections[p1] : undefined;
        correct = (a.optionId === "yes") === (actual === p2);
      }
      if (correct) {
        add(pid, POINTS.predictAnotherPlayer);
        const tgt = theory?.players[0];
        if (tgt) group = recordPrediction(group, pid, tgt, true);
      } else {
        const tgt = theory?.players[0];
        if (tgt) group = recordPrediction(group, pid, tgt, false);
      }
    }

    // resolve theory
    if (theory) {
      const res = resolveTheory(theory, {
        selections,
        choices,
        riskyOptionId: "B",
        safeOptionId: "A",
        againstMajorityOptionId: "B",
        withMajorityOptionId: "A",
        predictionCorrect:
          theory.type === "prediction_link"
            ? (() => {
                const [p1, p2] = theory.players;
                if (!p1 || !p2) return false;
                return choices[p1] === choices[p2];
              })()
            : undefined,
      });
      theories = theories.map((t) =>
        t.id === theory.id
          ? { ...t, status: res.status, priorConfidence: t.confidence, confidence: res.confidence }
          : t,
      );
      const resultText = isMatchTheory
        ? affinityResultText({ ...theory, confidence: res.confidence }, res.held)
        : theoryResultText({ ...theory, confidence: res.confidence }, res.held);
      aiMsgs.push(aiMessage(s, isMatchTheory ? "affinity" : "theory_result", resultText, round.index));
      lines.push(
        res.held
          ? isMatchTheory
            ? L("CONFIRMED", "CONFIRMADO")
            : L("THEORY STRENGTHENED", "TEORÍA REFORZADA")
          : isMatchTheory
            ? L("NOT CONFIRMED", "SIN CONFIRMAR")
            : L("THEORY DISCARDED", "TEORÍA DESCARTADA"),
      );
      // scoring: fooling the AI pays
      for (const pid of theory.players) {
        if (!res.held) add(pid, POINTS.foolAiHypothesis);
        else add(pid, POINTS.winAiChallenge / 3);
      }
    }
  }

  // ── DIRECTOR MECHANICS ──

  if (round.kind === "interrogation" && round.hotSeatId) {
    const target = round.hotSeatId;
    const ratings = roundAnswers
      .filter((a) => (round.predictors ?? round.participants).includes(a.playerId))
      .map((a) => Number(a.optionId))
      .filter((n) => n >= 1 && n <= 5);
    const avg = ratings.length ? ratings.reduce((x, y) => x + y, 0) / ratings.length : 3;
    const believed = avg >= 3;
    if (believed) {
      add(target, POINTS.winAiChallenge);
      rep(target, "trust", 12);
      rep(target, "influence", 8);
      rep(target, "suspicion", -10);
    } else {
      add(target, -100);
      rep(target, "suspicion", 18);
      rep(target, "trust", -8);
    }
    aiMsgs.push(aiMessage(s, "verdict", hotSeatVerdictText(nameOf(target), believed, avg), round.index));
    lines.push(hotSeatVerdictText(nameOf(target), believed, avg));
  }

  if (round.kind === "prophecy" && round.prophecy) {
    const subject = round.prophecy.subjectId;
    const choice = answerOf(subject)?.optionId;
    const held = choice === round.prophecy.predictedOptionId;
    if (held) {
      add(subject, 50);
      rep(subject, "suspicion", 8); // being readable = being watched
    } else {
      add(subject, POINTS.foolAiHypothesis + 50);
      rep(subject, "influence", 15);
    }
    for (const pid of round.predictors ?? []) {
      const a = answerOf(pid);
      if (!a) continue;
      const correct = (a.optionId === "yes") === held;
      if (correct) {
        add(pid, POINTS.predictAnotherPlayer);
        rep(pid, "influence", 4);
      }
      group = recordPrediction(group, pid, subject, correct);
    }
    aiMsgs.push(aiMessage(s, "prophecy_result", prophecyResultText(nameOf(subject), held, !held), round.index));
    lines.push(held ? L("I CALLED IT", "LO DIJE") : L("I WAS WRONG", "ME EQUIVOQUÉ"));
  }

  if (round.kind === "deal" && round.secretDeal) {
    const [a, b] = round.secretDeal.players;
    const ca = answerOf(a)?.optionId;
    const cb = answerOf(b)?.optionId;
    const pulledOff = !!ca && ca === cb;
    // the room points at who they think had a deal
    const accused = new Map<string, number>();
    for (const pid of round.predictors ?? []) {
      const opt = answerOf(pid)?.optionId;
      if (opt) accused.set(opt, (accused.get(opt) ?? 0) + 1);
      if (opt) group = recordAccusation(group, pid, opt);
    }
    const topTwo = [...accused.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map((e) => e[0]);
    const caught = topTwo.includes(a) && topTwo.includes(b);
    if (pulledOff && !caught) {
      add(a, round.secretDeal.reward / 2);
      add(b, round.secretDeal.reward / 2);
      rep(a, "influence", 15);
      rep(b, "influence", 15);
    } else if (pulledOff && caught) {
      add(a, -150);
      add(b, -150);
      rep(a, "suspicion", 25);
      rep(b, "suspicion", 25);
      for (const pid of round.predictors ?? []) {
        const opt = answerOf(pid)?.optionId;
        if (opt === a || opt === b) add(pid, POINTS.predictAnotherPlayer);
      }
    }
    aiMsgs.push(
      aiMessage(s, "deal_reveal", dealRevealText(pulledOff, caught, nameOf(a), nameOf(b)), round.index),
    );
    lines.push(
      !pulledOff
        ? L("No deal was struck.", "No se cerró ningún trato.")
        : caught
          ? L("DEAL EXPOSED", "TRATO AL DESCUBIERTO")
          : L("DEAL PULLED OFF", "TRATO CONSUMADO"),
    );
  }

  if (round.kind === "movement") {
    const tally = new Map<string, string[]>();
    for (const a of roundAnswers) {
      const arr = tally.get(a.optionId) ?? [];
      arr.push(a.playerId);
      tally.set(a.optionId, arr);
    }
    let alone: string | null = null;
    for (const [, g] of tally) if (g.length === 1) alone = g[0]!;
    const switched: string[] = []; // re-vote tracking is v2
    if (alone) {
      add(alone, POINTS.contrarianBonus + 25);
      rep(alone, "influence", 10);
    }
    recordPairAlignment(roundAnswers, (x, y, matched) => {
      group = recordAlignment(group, x, y, matched);
    });
    const statement = round.body ?? L("", "");
    const moveCounts = { left: (tally.get("A") ?? []).length, right: (tally.get("B") ?? []).length };
    aiMsgs.push(
      aiMessage(s, "movement", movementText(statement, alone, switched, s.players, moveCounts), round.index),
    );
    if (alone) {
      lines.push(
        L(`${nameOf(alone)} stood alone.`, `${nameOf(alone)} se quedó solo.`),
      );
    }
  }

  // apply score + reputation deltas to players
  const players = s.players.map((p) => {
    const r = repDelta[p.id];
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return {
      ...p,
      score: p.score + (scoreDelta[p.id] ?? 0),
      trust: r ? clamp(p.trust + r.trust) : p.trust,
      suspicion: r ? clamp(p.suspicion + r.suspicion) : p.suspicion,
      influence: r ? clamp(p.influence + r.influence) : p.influence,
    };
  });

  const outcome: RoundOutcome = {
    roundId: round.id,
    lines,
    scoreDelta,
    majorityOptionId,
    contrarians,
  };

  const usedQuestionIds = round.questionId
    ? [...new Set([...s.usedQuestionIds, round.questionId])]
    : s.usedQuestionIds;

  return bump({
    ...s,
    phase: "REVEAL",
    phaseDeadline: now() + MIN_DISPLAY_MS.REVEAL!,
    players,
    behavior,
    group,
    theories,
    outcomes: [...s.outcomes, outcome],
    aiMessages: [...s.aiMessages, ...aiMsgs],
    usedQuestionIds,
  });
}

function optionsFromRound(round: Round, playerId: string) {
  if (round.optionsByPlayer) {
    const opts = round.optionsByPlayer[playerId] ?? round.optionsByPlayer["*"];
    if (opts) return opts;
  }
  if (round.questionId) {
    const q = QUESTIONS_BY_ID[round.questionId];
    if (q) return q.options;
  }
  return [];
}

/** For each pair of answers in a comparable round, record whether they matched. */
function recordPairAlignment(
  answers: Answer[],
  cb: (a: string, b: string, matched: boolean) => void,
): void {
  for (let i = 0; i < answers.length; i++) {
    for (let j = i + 1; j < answers.length; j++) {
      const a = answers[i]!;
      const b = answers[j]!;
      cb(a.playerId, b.playerId, a.optionId === b.optionId);
    }
  }
}

// ---------- round advancement ----------

function nextRound(s: GameState): GameState {
  const nextIndex = s.rounds.length;
  if (nextIndex >= totalRounds(s)) {
    const missions = evaluateMissions(s);
    const withMissions = { ...s, missions };
    const report = buildFinalReport(withMissions);
    const msgs: AiMessage[] = [];
    if (s.mode === "director" && s.directorLog.length > 0) {
      msgs.push(aiMessage(s, "confession", confessionText(withMissions), nextIndex));
    }
    if (missions.length > 0) {
      msgs.push(
        aiMessage(
          s,
          "missions",
          missionsRevealText(missions.length, missions.filter((m) => m.completed).length),
          nextIndex,
        ),
      );
    }
    msgs.push(aiMessage(s, "final", report.finalTheory, nextIndex + 1));
    return bump({
      ...withMissions,
      phase: "FINAL_RESULTS",
      endedAt: now(),
      report,
      aiMessages: [...s.aiMessages, ...msgs],
    });
  }

  let next: GameState = { ...s };

  if (s.mode === "director") {
    const { round, move } = buildDirectorRound(next);
    next = noteSpotlight(next, move);
    next = {
      ...next,
      rounds: [...next.rounds, round],
      currentRoundIndex: nextIndex,
      phase: "ROUND_INTRO",
      phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_INTRO!,
      usedQuestionIds: round.questionId
        ? [...new Set([...next.usedQuestionIds, round.questionId])]
        : next.usedQuestionIds,
    };
    return bump(next);
  }

  const build = buildRoundForSlot(next, nextIndex);
  next = {
    ...next,
    rounds: [...next.rounds, build.round],
    currentRoundIndex: nextIndex,
    phase: "ROUND_INTRO",
    phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_INTRO!,
    theories: build.theoryPatch
      ? mergeTheories(next.theories, build.theoryPatch)
      : next.theories,
    usedQuestionIds: build.round.questionId
      ? [...new Set([...next.usedQuestionIds, build.round.questionId])]
      : next.usedQuestionIds,
  };
  return bump(next);
}

/** The AI shows its hand: every move it made and why. */
function confessionText(s: GameState): Localized {
  const nameOf = (id: string) => s.players.find((p) => p.id === id)?.nickname ?? "?";
  const beats = s.directorLog.filter((m) => m.signal !== "warmup" && m.signal !== "cadence");
  const linesEn: string[] = ["Here's what I did to you tonight."];
  const linesEs: string[] = ["Esto es lo que os hice esta noche."];
  const seen = new Set<string>();
  const unique = beats.filter((m) => (seen.has(m.reason.en) ? false : (seen.add(m.reason.en), true)));
  for (const m of unique.slice(0, 5)) {
    linesEn.push(m.reason.en);
    linesEs.push(m.reason.es);
  }
  const winner = [...s.players].sort((a, b) => b.score - a.score)[0];
  if (winner) {
    linesEn.push(`${nameOf(winner.id)} played me better than the rest.`);
    linesEs.push(`${nameOf(winner.id)} me jugó mejor que el resto.`);
  }
  return { en: linesEn.join(" "), es: linesEs.join(" ") };
}

function mergeTheories(existing: Theory[], patch: Theory[]): Theory[] {
  const map = new Map(existing.map((t) => [t.id, t]));
  for (const t of patch) {
    const prev = map.get(t.id);
    map.set(t.id, prev ? { ...prev, ...t } : t);
  }
  return [...map.values()];
}

// ---------- auto-drive helper (used by the /advance endpoint) ----------

/**
 * Server-side guard: during ANSWERING the server advances on its own
 * once everyone has answered or the timer has expired, so a slow or
 * disconnected host never freezes the game. Display phases are nudged
 * forward by the host client (or any client, idempotently) via /advance.
 */
export function shouldAutoAdvance(s: GameState): boolean {
  if (s.phase !== "ANSWERING") return false;
  if (allAnswered(s)) return true;
  if (s.phaseDeadline && now() >= s.phaseDeadline) return true;
  return false;
}
