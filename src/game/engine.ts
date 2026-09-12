import { applyChoice, emptyProfile } from "./behavior";
import {
  confidenceUpdateText,
  counterTheoryText,
  hypothesisAnnounceText,
  testResultText,
} from "./commentary";
import { QUESTIONS_BY_ID } from "./questions";
import { buildFinalReport } from "./report";
import {
  concentration,
  emptyGroupModel,
  recordAlignment,
  recordDilemma,
  recordSelection,
  setVoteConcentration,
} from "./group";
import {
  buildHypothesis,
  buildTest,
  decisionConfirmsHigh,
  pickAuthor,
  pickAutoTarget,
  pickAutoTemplate,
  updateConfidence,
} from "./hypothesis";
import { templateById } from "./hypothesisContent";
import type { Stakes } from "./testContent";
import { scoreDilemma, scoreMajorityMinority, POINTS } from "./scoring";
import { buildObservationRound, chooseSlotKind, makeRound, playerOptions, rngFor } from "./selector";
import { hashString } from "@/lib/rng";
import type {
  AiMessage,
  Answer,
  GameState,
  Hypothesis,
  HypothesisCategory,
  Lang,
  Localized,
  Player,
  Round,
  RoundOutcome,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Server-authoritative state machine. Pure functions: each takes
// a GameState and returns a NEW GameState. The store persists it,
// realtime pushes it, clients render it.
//
// Loop: LOBBY -> ROUND_INTRO -> PRIVATE_DECISION -> REVEAL -> (next)
//                            \-> HYPOTHESIS -> TEST_SETUP -> PRIVATE_DECISION -> REVEAL -> CONFIDENCE_UPDATE -> (next)
// -> FINAL_REPORT
// ─────────────────────────────────────────────────────────────

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const DISCONNECT_GRACE_MS = 45_000;
/** don't persist a heartbeat more often than this — clients poll every 1-3s,
 *  but presence only needs to be accurate to within DISCONNECT_GRACE_MS */
const HEARTBEAT_THROTTLE_MS = 8_000;

const CHALLENGE_STAKE = 50;
const STAKES_GAME_POINTS: Record<Stakes, number> = { low: 80, medium: 150, high: 250 };
const STAKES_THEORY_POINTS: Record<Stakes, number> = { low: 20, medium: 30, high: 45 };
const DEFAULT_STAKES: Stakes = "medium";

const L = (en: string, es: string): Localized => ({ en, es });

function bump(s: GameState): GameState {
  return { ...s, version: s.version + 1 };
}

function now(): number {
  return Date.now();
}

// ---------- creation & lobby ----------

export function freshPlayer(p: { id: string; nickname: string; lang: Lang }, isHost: boolean, t: number = Date.now()): Player {
  return {
    id: p.id,
    nickname: p.nickname.trim().slice(0, 20) || "Player",
    lang: p.lang,
    isHost,
    connected: true,
    joinedAt: t,
    lastSeen: t,
    score: 0,
    theoryScore: 0,
    authorCount: 0,
  };
}

export function createGame(code: string, host: { id: string; nickname: string; lang: Lang }): GameState {
  const t = now();
  return {
    code,
    phase: "LOBBY",
    createdAt: t,
    players: [freshPlayer(host, true, t)],
    hostId: host.id,
    targetRounds: 12,
    rounds: [],
    currentRoundIndex: -1,
    answers: [],
    behavior: {},
    group: emptyGroupModel(),
    hypotheses: [],
    challenges: [],
    outcomes: [],
    aiMessages: [],
    version: 1,
    seed: hashString(code + t) >>> 0,
    usedQuestionIds: [],
    usedTestTemplateIds: [],
  };
}

export function addPlayer(s: GameState, p: { id: string; nickname: string; lang: Lang }): { state: GameState; error?: string } {
  if (s.players.some((x) => x.id === p.id)) {
    return { state: setConnected(s, p.id, true) };
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
  const players = s.players.map((p) => (p.id === playerId ? { ...p, connected, lastSeen: now() } : p));
  return bump({ ...s, players });
}

export function heartbeat(s: GameState, playerId: string): GameState {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return s;
  const t = now();
  // throttle: skip the write when we just heard from this player. Every
  // client polls every 1-3s, so without this every single poll from every
  // player was a database write — enough concurrent players and the row's
  // optimistic-concurrency version churns faster than requests can land.
  if (p.connected && t - p.lastSeen < HEARTBEAT_THROTTLE_MS) return s;
  const players = s.players.map((x) => (x.id === playerId ? { ...x, connected: true, lastSeen: t } : x));
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
  return bump({ ...s, players: players.map((p) => ({ ...p, isHost: p.id === hostId })), hostId });
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
    const candidate = players.filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (candidate) {
      changed = true;
      next = { ...next, hostId: candidate.id, players: players.map((p) => ({ ...p, isHost: p.id === candidate.id })) };
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
    targetRounds: Math.max(10, Math.min(14, s.players.length + 6)),
    currentRoundIndex: 0,
    phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_INTRO!,
  };

  const round = buildObservationRound(next, 0);
  next = {
    ...next,
    rounds: [round],
    usedQuestionIds: round.questionId ? [round.questionId] : [],
  };
  return { state: bump(next) };
}

export function totalRounds(s: GameState): number {
  return s.targetRounds;
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
  if (round.kind === "theory_test" && round.test && playerId === round.test.targetId) {
    if (round.test.comparisonOptions) return [];
    return [
      { id: "A", label: round.test.optionA.label },
      { id: "B", label: round.test.optionB.label },
    ];
  }
  return [];
}

/** who is expected to answer this round */
export function respondents(round: Round): string[] {
  return [...new Set([...(round.participants ?? []), ...(round.predictors ?? [])])];
}

export function submitAnswer(s: GameState, input: { playerId: string; optionId: string }): { state: GameState; error?: string } {
  if (s.phase !== "PRIVATE_DECISION") return { state: s, error: "not_answering" };
  const round = currentRound(s);
  if (!round) return { state: s, error: "no_round" };
  const allowed = respondents(round);
  if (!allowed.includes(input.playerId)) return { state: s, error: "not_a_respondent" };
  if (s.answers.some((a) => a.roundId === round.id && a.playerId === input.playerId)) {
    return { state: s, error: "already_answered" };
  }
  let validOptions: string[];
  if (round.kind === "theory_test" && round.test?.comparisonOptions) {
    validOptions = round.test.comparisonOptions;
  } else {
    validOptions = optionsForPlayer(round, input.playerId).map((o) => o.id);
  }
  if (!validOptions.includes(input.optionId)) return { state: s, error: "invalid_option" };

  const answer: Answer = { roundId: round.id, playerId: input.playerId, optionId: input.optionId, at: now() };
  return { state: bump({ ...s, answers: [...s.answers, answer] }) };
}

export function allAnswered(s: GameState): boolean {
  const round = currentRound(s);
  if (!round) return false;
  const need = respondents(round).filter((id) => s.players.find((x) => x.id === id)?.connected);
  const have = new Set(s.answers.filter((a) => a.roundId === round.id).map((a) => a.playerId));
  return need.length > 0 && need.every((id) => have.has(id));
}

// ---------- hypothesis-cycle actions ----------

export function submitHypothesis(
  s: GameState,
  input: {
    playerId: string;
    targetId: string;
    category: HypothesisCategory;
    templateId: string;
    anonymous: boolean;
    counterOf?: string;
  },
): { state: GameState; error?: string } {
  if (s.phase !== "HYPOTHESIS" || !s.pendingCycle) return { state: s, error: "not_hypothesis_phase" };
  const cycle = s.pendingCycle;
  const template = templateById(input.templateId);
  if (!template || template.category !== input.category) return { state: s, error: "invalid_template" };
  if (input.targetId === input.playerId) return { state: s, error: "cannot_target_self" };
  if (!s.players.some((p) => p.id === input.targetId && p.connected)) return { state: s, error: "invalid_target" };

  const isAuthor = input.playerId === cycle.authorId;
  if (isAuthor && !input.counterOf) {
    if (cycle.submitted) return { state: s, error: "already_submitted" };
    const pendingCycle = { ...cycle, submitted: { targetId: input.targetId, category: input.category, templateId: input.templateId, anonymous: input.anonymous } };
    return { state: bump({ ...s, pendingCycle }) };
  }

  // counter-theory from anyone but the author, against the just-announced hypothesis
  if (!isAuthor) {
    if (cycle.counter) return { state: s, error: "counter_already_filed" };
    if (!cycle.submitted) return { state: s, error: "no_hypothesis_yet" };
    const pendingCycle = { ...cycle, counter: { creatorId: input.playerId, templateId: input.templateId, anonymous: input.anonymous } };
    return { state: bump({ ...s, pendingCycle }) };
  }

  return { state: s, error: "invalid_submission" };
}

export function challengeHypothesis(s: GameState, input: { playerId: string; stake?: number }): { state: GameState; error?: string } {
  if (s.phase !== "HYPOTHESIS" || !s.pendingCycle?.submitted) return { state: s, error: "no_hypothesis_yet" };
  const cycle = s.pendingCycle;
  if (input.playerId === cycle.authorId || input.playerId === cycle.submitted!.targetId) {
    return { state: s, error: "cannot_challenge" };
  }
  if (cycle.challenges.some((c) => c.challengerId === input.playerId)) return { state: s, error: "already_challenged" };
  const stake = Math.min(CHALLENGE_STAKE, input.stake ?? CHALLENGE_STAKE);
  const pendingCycle = { ...cycle, challenges: [...cycle.challenges, { challengerId: input.playerId, stake }] };
  return { state: bump({ ...s, pendingCycle }) };
}

export function submitStakes(s: GameState, input: { playerId: string; stakes: Stakes }): { state: GameState; error?: string } {
  if (s.phase !== "TEST_SETUP" || !s.pendingCycle) return { state: s, error: "not_test_setup_phase" };
  if (input.playerId !== s.pendingCycle.authorId) return { state: s, error: "not_author" };
  if (s.pendingCycle.stakes) return { state: s, error: "already_set" };
  return { state: bump({ ...s, pendingCycle: { ...s.pendingCycle, stakes: input.stakes } }) };
}

// ---------- the reducer ----------

/** Minimum time a display phase stays on screen before anyone can skip it. */
export const MIN_DISPLAY_MS: Record<string, number> = {
  ROUND_INTRO: 3500,
  REVEAL: 5500,
  CONFIDENCE_UPDATE: 6500,
};

export function advance(s: GameState): GameState {
  switch (s.phase) {
    case "LOBBY":
    case "FINAL_REPORT":
      return s;

    case "ROUND_INTRO":
      return enterFromIntro(s);

    case "PRIVATE_DECISION":
      return doReveal(s);

    case "REVEAL": {
      const round = currentRound(s);
      if (round?.kind === "theory_test") {
        return bump({ ...s, phase: "CONFIDENCE_UPDATE", phaseDeadline: now() + MIN_DISPLAY_MS.CONFIDENCE_UPDATE! });
      }
      return nextRound(s);
    }

    case "CONFIDENCE_UPDATE":
      return nextRound(s);

    case "HYPOTHESIS":
      return enterTestSetup(s);

    case "TEST_SETUP":
      return enterPrivateDecisionForTest(s);

    default:
      return s;
  }
}

function enterFromIntro(s: GameState): GameState {
  const round = currentRound(s);
  if (!round) return nextRound(s);

  if (round.kind === "hypothesis") {
    const author = s.players.find((p) => p.id === round.authorId);
    const authorName = author?.nickname ?? "?";
    const msg = aiMessage(
      s,
      "hypothesis",
      L(`${authorName}, you have a theory. Who's it about?`, `${authorName}, tienes una teoría. ¿Sobre quién es?`),
      round.index,
    );
    return bump({
      ...s,
      phase: "HYPOTHESIS",
      phaseDeadline: now() + round.timeLimit * 1000,
      pendingCycle: { roundIndex: round.index, authorId: round.authorId!, challenges: [] },
      aiMessages: [...s.aiMessages, msg],
    });
  }

  return bump({
    ...s,
    phase: "PRIVATE_DECISION",
    phaseDeadline: round.timeLimit > 0 ? now() + round.timeLimit * 1000 : undefined,
  });
}

function aiMessage(s: GameState, kind: AiMessage["kind"], text: Localized, roundIndex: number): AiMessage {
  return { id: "m_" + hashString(kind + roundIndex + text.en + s.version).toString(36), kind, text, roundIndex, at: now() };
}

// ---------- hypothesis cycle: HYPOTHESIS -> TEST_SETUP ----------

function enterTestSetup(s: GameState): GameState {
  const round = currentRound(s);
  if (!round || !s.pendingCycle) return nextRound(s);
  const rand = rngFor(s, "auto" + round.index);
  let cycle = s.pendingCycle;

  // nobody authored in time — auto-fill so the game never stalls
  if (!cycle.submitted) {
    const targetId = pickAutoTarget(s, cycle.authorId) ?? s.players.find((p) => p.connected && p.id !== cycle.authorId)?.id;
    if (!targetId) return nextRound(s);
    const template = pickAutoTemplate(s, targetId, rand);
    cycle = { ...cycle, submitted: { targetId, category: template.category, templateId: template.id, anonymous: false } };
  }

  const hypothesis = buildHypothesis(
    s,
    {
      creatorId: cycle.authorId,
      targetId: cycle.submitted!.targetId,
      templateId: cycle.submitted!.templateId,
      anonymous: cycle.submitted!.anonymous,
      autoFilled: !s.pendingCycle.submitted,
    },
    round.index,
    rand,
  );

  const msgs: AiMessage[] = [aiMessage(s, "hypothesis", hypothesisAnnounceText(hypothesis, s.players), round.index)];

  let counterHypothesis: Hypothesis | null = null;
  if (cycle.counter) {
    counterHypothesis = buildHypothesis(
      s,
      {
        creatorId: cycle.counter.creatorId,
        targetId: hypothesis.targetId,
        templateId: cycle.counter.templateId,
        anonymous: cycle.counter.anonymous,
        counterOf: hypothesis.id,
      },
      round.index,
      rand,
    );
    msgs.push(
      aiMessage(
        s,
        "counter_theory",
        counterTheoryText(counterHypothesis.anonymous, s.players.find((p) => p.id === counterHypothesis!.creatorId)?.nickname ?? "?"),
        round.index,
      ),
    );
  }

  const players = s.players.map((p) => (p.id === cycle.authorId ? { ...p, authorCount: p.authorCount + 1 } : p));
  const hypotheses = counterHypothesis ? [...s.hypotheses, hypothesis, counterHypothesis] : [...s.hypotheses, hypothesis];

  const rounds = s.rounds.map((r) =>
    r.id === round.id ? { ...r, hypothesisId: hypothesis.id, counterHypothesisId: counterHypothesis?.id } : r,
  );

  return bump({
    ...s,
    phase: "TEST_SETUP",
    phaseDeadline: now() + 10_000,
    players,
    hypotheses,
    rounds,
    aiMessages: [...s.aiMessages, ...msgs],
    pendingCycle: { ...cycle, submitted: cycle.submitted },
  });
}

function enterPrivateDecisionForTest(s: GameState): GameState {
  const introRound = currentRound(s);
  if (!introRound || !s.pendingCycle) return nextRound(s);
  const hypothesis = s.hypotheses.find((h) => h.id === introRound.hypothesisId);
  if (!hypothesis) return nextRound(s);
  const counter = introRound.counterHypothesisId ? s.hypotheses.find((h) => h.id === introRound.counterHypothesisId) ?? null : null;

  const stakes: Stakes = s.pendingCycle.stakes ?? DEFAULT_STAKES;
  const rand = rngFor(s, "test" + introRound.index);
  const test = buildTest(s, hypothesis, counter, stakes, rand);

  const index = introRound.index + 1;
  const testRound: Round = makeRound({
    id: `r${index}`,
    index,
    kind: "theory_test",
    participants: [hypothesis.targetId],
    hypothesisId: hypothesis.id,
    counterHypothesisId: counter?.id,
    test,
    title: L("Testing the theory", "Poniendo la teoría a prueba"),
    body: test.scenario,
    timeLimit: 20,
    optionsByPlayer: test.comparisonOptions
      ? { [hypothesis.targetId]: playerOptions(s.players, [hypothesis.targetId]).filter((o) => test.comparisonOptions!.includes(o.id)) }
      : undefined,
  });

  const hypotheses = s.hypotheses.map((h) => (h.id === hypothesis.id ? { ...h, testRoundId: testRound.id } : h));

  return bump({
    ...s,
    phase: "PRIVATE_DECISION",
    phaseDeadline: now() + testRound.timeLimit * 1000,
    rounds: [...s.rounds, testRound],
    currentRoundIndex: index,
    hypotheses,
    usedTestTemplateIds: [...new Set([...s.usedTestTemplateIds, test.templateId])],
  });
}

// ---------- reveal / outcome ----------

function roundOptionTags(round: Round, playerId: string, optionId: string) {
  if (round.optionsByPlayer) {
    const opts = round.optionsByPlayer[playerId] ?? round.optionsByPlayer["*"];
    const found = opts?.find((o) => o.id === optionId);
    if (found) return found.tags;
  }
  if (round.questionId) {
    const q = QUESTIONS_BY_ID[round.questionId];
    return q?.options.find((o) => o.id === optionId)?.tags ?? {};
  }
  return {};
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
function recordPairAlignment(answers: Answer[], cb: (a: string, b: string, matched: boolean) => void): void {
  for (let i = 0; i < answers.length; i++) {
    for (let j = i + 1; j < answers.length; j++) {
      cb(answers[i]!.playerId, answers[j]!.playerId, answers[i]!.optionId === answers[j]!.optionId);
    }
  }
}

function doReveal(s: GameState): GameState {
  const round = currentRound(s);
  if (!round) return nextRound(s);
  const roundAnswers = s.answers.filter((a) => a.roundId === round.id);
  const answerOf = (pid: string) => roundAnswers.find((a) => a.playerId === pid);

  let behavior = { ...s.behavior };
  let group = s.group;
  const scoreDelta: Record<string, number> = {};
  const theoryScoreDelta: Record<string, number> = {};
  const lines: Localized[] = [];
  const aiMsgs: AiMessage[] = [];
  let majorityOptionId: string | undefined;
  let contrarians: string[] | undefined;

  const nameOf = (id: string) => s.players.find((p) => p.id === id)?.nickname ?? "?";
  const add = (id: string, n: number) => {
    scoreDelta[id] = (scoreDelta[id] ?? 0) + n;
  };
  const addTheory = (id: string, n: number) => {
    theoryScoreDelta[id] = (theoryScoreDelta[id] ?? 0) + n;
  };

  for (const a of roundAnswers) add(a.playerId, POINTS.answered);

  // behavior updates from tags
  for (const a of roundAnswers) {
    const tags = roundOptionTags(round, a.playerId, a.optionId);
    if (Object.keys(tags).length > 0 && behavior[a.playerId]) {
      behavior = { ...behavior, [a.playerId]: applyChoice(behavior[a.playerId]!, tags) };
    }
  }

  if (round.kind === "individual") {
    const tally = new Map<string, number>();
    for (const a of roundAnswers) tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && round.questionId) {
      const lbl = QUESTIONS_BY_ID[round.questionId]?.options.find((o) => o.id === top[0])?.label;
      if (lbl) lines.push(L(`Most common: "${lbl.en}"`, `Lo más elegido: «${lbl.es}»`));
    }
    for (const [opt, count] of tally) {
      if (count === 1 && roundAnswers.length >= 4) {
        const loner = roundAnswers.find((a) => a.optionId === opt);
        if (loner) {
          const lbl = optionsFromRound(round, loner.playerId).find((o) => o.id === opt)?.label;
          lines.push(L(`${nameOf(loner.playerId)} was the only one to pick ${lbl?.en ?? "that"}.`, `${nameOf(loner.playerId)} fue el único en elegir ${lbl?.es ?? "eso"}.`));
        }
      }
    }
    recordPairAlignment(roundAnswers, (a, b, matched) => (group = recordAlignment(group, a, b, matched)));
  }

  if (round.kind === "majority_minority") {
    const res = scoreMajorityMinority(roundAnswers.map((a) => ({ playerId: a.playerId, optionId: a.optionId })));
    majorityOptionId = res.majorityOptionId ?? undefined;
    contrarians = res.contrarians;
    for (const [id, d] of Object.entries(res.deltas)) add(id, d);
    if (majorityOptionId && round.questionId) {
      const lbl = QUESTIONS_BY_ID[round.questionId]?.options.find((o) => o.id === majorityOptionId)?.label;
      if (lbl) lines.push(L(`Majority: ${lbl.en}`, `Mayoría: ${lbl.es}`));
    }
    for (const c of res.contrarians) lines.push(L(`${nameOf(c)} went against the room.`, `${nameOf(c)} fue contra la sala.`));
    if (majorityOptionId) {
      for (const a of roundAnswers) {
        const withRoom = a.optionId === majorityOptionId;
        const prof = behavior[a.playerId];
        if (prof) {
          behavior = {
            ...behavior,
            [a.playerId]: applyChoice(prof, { conformity: withRoom ? 0.55 : -0.55, contrarianism: withRoom ? -0.55 : 0.55, socialAlignment: withRoom ? 0.4 : -0.4 }),
          };
        }
      }
    }
    recordPairAlignment(roundAnswers, (a, b, matched) => (group = recordAlignment(group, a, b, matched)));
  }

  if (round.kind === "group_vote" || round.kind === "trust") {
    const tally = new Map<string, number>();
    for (const a of roundAnswers) tally.set(a.optionId, (tally.get(a.optionId) ?? 0) + 1);
    for (const a of roundAnswers) group = recordSelection(group, a.playerId, a.optionId);
    group = setVoteConcentration(group, round.id, concentration([...tally.values()]));
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      add(top[0], POINTS.majorityBonus);
      lines.push(L(`${nameOf(top[0])} got the most votes (${top[1]}).`, `${nameOf(top[0])} se llevó más votos (${top[1]}).`));
    }
  }

  if (round.kind === "social_dilemma" && round.pairs) {
    for (const [a, b] of round.pairs) {
      const aCoop = (answerOf(a)?.optionId ?? "A") === "A";
      const bCoop = (answerOf(b)?.optionId ?? "A") === "A";
      const deltas = scoreDilemma({ aId: a, bId: b, aCooperated: aCoop, bCooperated: bCoop });
      for (const [id, d] of Object.entries(deltas)) add(id, d);
      group = recordDilemma(group, a, b, aCoop, bCoop);
      if (aCoop && bCoop) lines.push(L(`${nameOf(a)} & ${nameOf(b)} both cooperated.`, `${nameOf(a)} y ${nameOf(b)} cooperaron.`));
      else if (!aCoop && !bCoop) lines.push(L(`${nameOf(a)} & ${nameOf(b)} both betrayed.`, `${nameOf(a)} y ${nameOf(b)} se traicionaron.`));
      else {
        const betrayer = !aCoop ? a : b;
        const victim = !aCoop ? b : a;
        lines.push(L(`${nameOf(betrayer)} betrayed ${nameOf(victim)}.`, `${nameOf(betrayer)} traicionó a ${nameOf(victim)}.`));
      }
    }
  }

  if (round.kind === "theory_test" && round.test) {
    const test = round.test;
    const decision = answerOf(test.targetId)?.optionId;
    add(test.targetId, STAKES_GAME_POINTS[test.stakes]);

    const decisionLabel = test.comparisonOptions
      ? { en: nameOf(decision ?? ""), es: nameOf(decision ?? "") }
      : decision === "A"
        ? test.optionA.label
        : decision === "B"
          ? test.optionB.label
          : L("no decision", "sin decisión");
    aiMsgs.push(aiMessage(s, "test_result", testResultText(nameOf(test.targetId), decisionLabel), round.index));
    lines.push(testResultText(nameOf(test.targetId), decisionLabel));

    const confirmsHigh = decision ? decisionConfirmsHigh(test, decision) : null;
    if (confirmsHigh !== null) {
      for (const hid of round.test.hypothesisIds) {
        const hyp = s.hypotheses.find((h) => h.id === hid);
        if (!hyp) continue;
        const res = updateConfidence(hyp, confirmsHigh, test.stakes);
        s = {
          ...s,
          hypotheses: s.hypotheses.map((h) =>
            h.id === hyp.id
              ? { ...h, confidence: res.confidence, status: res.status, evidenceCount: h.evidenceCount + 1, supportingEvidence: res.supportingEvidence, contradictingEvidence: res.contradictingEvidence }
              : h,
          ),
        };
        aiMsgs.push(aiMessage(s, "confidence_update", confidenceUpdateText(res.held, res.delta), round.index));
        lines.push(res.held ? L("This supports the theory.", "Esto respalda la teoría.") : L("This contradicts the theory.", "Esto contradice la teoría."));
        if (res.held) addTheory(hyp.creatorId, STAKES_THEORY_POINTS[test.stakes]);

        // challenges ("I bet this won't hold") only ever target the
        // original hypothesis, never its counter-theory
        if (!hyp.counterOf) {
          for (const ch of s.pendingCycle?.challenges ?? []) {
            if (res.held) add(ch.challengerId, -ch.stake);
            else add(ch.challengerId, ch.stake);
          }
        }
      }
    }
  }

  const players = s.players.map((p) => ({
    ...p,
    score: Math.max(0, p.score + (scoreDelta[p.id] ?? 0)),
    theoryScore: Math.max(0, p.theoryScore + (theoryScoreDelta[p.id] ?? 0)),
  }));

  const outcome: RoundOutcome = { roundId: round.id, lines, scoreDelta, theoryScoreDelta, majorityOptionId, contrarians };
  const usedQuestionIds = round.questionId ? [...new Set([...s.usedQuestionIds, round.questionId])] : s.usedQuestionIds;

  return bump({
    ...s,
    phase: "REVEAL",
    phaseDeadline: now() + MIN_DISPLAY_MS.REVEAL!,
    players,
    behavior,
    group,
    outcomes: [...s.outcomes, outcome],
    aiMessages: [...s.aiMessages, ...aiMsgs],
    usedQuestionIds,
    pendingCycle: round.kind === "theory_test" ? undefined : s.pendingCycle,
  });
}

// ---------- round advancement ----------

function nextRound(s: GameState): GameState {
  const nextIndex = s.rounds.length;
  if (nextIndex >= totalRounds(s)) {
    const report = buildFinalReport(s);
    const msgs: AiMessage[] = [aiMessage(s, "final", report.finalAnalysis, nextIndex + 1)];
    return bump({ ...s, phase: "FINAL_REPORT", endedAt: now(), report, aiMessages: [...s.aiMessages, ...msgs], pendingCycle: undefined });
  }

  const slotKind = chooseSlotKind(s, nextIndex);
  const author = slotKind === "hypothesis" ? pickAuthor(s) : null;

  let round: Round;
  if (slotKind === "hypothesis" && author) {
    round = makeRound({ id: `r${nextIndex}`, index: nextIndex, kind: "hypothesis", participants: [], authorId: author, timeLimit: 25 });
  } else {
    round = buildObservationRound(s, nextIndex);
  }

  const next: GameState = {
    ...s,
    rounds: [...s.rounds, round],
    currentRoundIndex: nextIndex,
    phase: "ROUND_INTRO",
    phaseDeadline: now() + MIN_DISPLAY_MS.ROUND_INTRO!,
    usedQuestionIds: round.questionId ? [...new Set([...s.usedQuestionIds, round.questionId])] : s.usedQuestionIds,
    pendingCycle: undefined,
  };
  return bump(next);
}

// ---------- auto-drive helper (used by the /advance endpoint) ----------

/**
 * Server-side guard: during PRIVATE_DECISION the server advances on its
 * own once everyone has answered or the timer has expired. During
 * HYPOTHESIS / TEST_SETUP the timer alone drives the fallback (a human
 * not acting is expected and handled by auto-fill, not an error).
 */
export function shouldAutoAdvance(s: GameState): boolean {
  if (s.phase === "PRIVATE_DECISION") {
    if (allAnswered(s)) return true;
    return !!s.phaseDeadline && now() >= s.phaseDeadline;
  }
  if (s.phase === "HYPOTHESIS" || s.phase === "TEST_SETUP") {
    return !!s.phaseDeadline && now() >= s.phaseDeadline;
  }
  return false;
}
