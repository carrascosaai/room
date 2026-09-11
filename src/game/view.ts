import { QUESTIONS_BY_ID } from "./questions";
import { currentRound, optionsForPlayer, respondents, totalRounds } from "./engine";
import { evidenceLocalized } from "./commentary";
import { missionText } from "./missions";
import type { AiMessage, GamePhase, GameState, Localized, Theory } from "./types";
import type { FinalReport } from "./report";

// ─────────────────────────────────────────────────────────────
// Projection: GameState -> what a specific player is allowed to
// see. Hidden data (behavior tags, other players' un-revealed
// answers, "forming" theories) never crosses this boundary.
// ─────────────────────────────────────────────────────────────

export interface PlayerViewPlayer {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  trust: number;
  suspicion: number;
  influence: number;
}

export interface RevealAnswerRow {
  playerId: string;
  optionId: string;
  label: Localized | null;
}

export interface PlayerView {
  code: string;
  phase: GamePhase;
  mode: "director" | "classic";
  version: number;
  phaseDeadline?: number;
  storeKind: "memory" | "supabase";
  aiEnabled: boolean;
  /** true when this projection is for the shared "stage" screen */
  stage: boolean;

  me: { id: string; isHost: boolean; connected: boolean } | null;
  players: PlayerViewPlayer[];
  minPlayers: number;
  maxPlayers: number;

  totalSlots: number;
  slotIndex: number;

  round?: {
    id: string;
    index: number;
    kind: string;
    title?: Localized;
    body?: Localized;
    prompt?: Localized;
    timeLimit: number;
    myOptions: { id: string; label: Localized }[];
    iRespond: boolean;
    iAmParticipant: boolean;
    iAmPredictor: boolean;
    iAnswered: boolean;
    answeredCount: number;
    respondentCount: number;
    theory?: PublicTheory;
    participants: string[];
    // ── talk / stage ──
    talkSeconds?: number;
    talkPrompt?: Localized;
    stageInstruction?: Localized;
    hotSeatId?: string;
    iAmHotSeat: boolean;
    liveTally?: Record<string, number>;
    /** the viewer's own secret pact (only the two dealmakers get this) */
    mySecretDeal?: { task: Localized; reward: number };
    prophecyCall?: Localized;
  };

  reveal?: {
    lines: Localized[];
    answers: RevealAnswerRow[];
    scoreDelta: Record<string, number>;
    majorityOptionId?: string;
    contrarians: string[];
  };

  aiMessages: AiMessage[];
  theories: PublicTheory[];
  report?: FinalReport;

  /** the viewer's own secret mission (only ever their own, until the end) */
  myMission?: { text: Localized; completed?: boolean };
}

export interface PublicTheory {
  id: string;
  type: Theory["type"];
  players: string[];
  evidence: Localized;
  confidence: number;
  status: Theory["status"];
}

function publicTheory(t: Theory): PublicTheory {
  return {
    id: t.id,
    type: t.type,
    players: t.players,
    evidence: evidenceLocalized(t),
    confidence: t.confidence,
    status: t.status,
  };
}

const REVEAL_PHASES: GamePhase[] = ["REVEAL", "ROUND_RESULT"];

export function projectView(
  state: GameState,
  viewerId: string | null,
  meta: { storeKind?: "memory" | "supabase"; aiEnabled?: boolean; stage?: boolean } = {},
): PlayerView {
  const me = viewerId ? state.players.find((p) => p.id === viewerId) ?? null : null;
  const round = currentRound(state);
  const roundAnswers = round ? state.answers.filter((a) => a.roundId === round.id) : [];
  const isStage = meta.stage === true;

  const view: PlayerView = {
    code: state.code,
    phase: state.phase,
    mode: state.mode,
    version: state.version,
    phaseDeadline: state.phaseDeadline,
    storeKind: meta.storeKind ?? "memory",
    aiEnabled: meta.aiEnabled ?? false,
    stage: isStage,
    me: me ? { id: me.id, isHost: me.isHost, connected: me.connected } : null,
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
      trust: p.trust,
      suspicion: p.suspicion,
      influence: p.influence,
    })),
    minPlayers: 3,
    maxPlayers: 10,
    totalSlots: totalRounds(state),
    slotIndex: state.currentRoundIndex,
    aiMessages: state.aiMessages,
    theories: state.theories
      .filter((t) => t.status !== "forming")
      .map(publicTheory),
    report: state.phase === "FINAL_RESULTS" ? state.report : undefined,
  };

  if (viewerId) {
    const mine = state.missions.find((m) => m.playerId === viewerId);
    if (mine) {
      view.myMission = {
        text: missionText(mine, state.players),
        completed: state.phase === "FINAL_RESULTS" ? mine.completed : undefined,
      };
    }
  }

  if (round && state.phase !== "LOBBY" && state.phase !== "FINAL_RESULTS") {
    const allowed = respondents(round);
    const iAmParticipant = viewerId ? round.participants.includes(viewerId) : false;
    const iAmPredictor = viewerId ? (round.predictors ?? []).includes(viewerId) : false;
    const iRespond = viewerId ? allowed.includes(viewerId) : false;
    const iAmHotSeat = !!viewerId && !!round.hotSeatId && viewerId === round.hotSeatId;
    const q = round.questionId ? QUESTIONS_BY_ID[round.questionId] : undefined;

    let liveTally: Record<string, number> | undefined;
    if (round.liveTally && (isStage || round.kind === "movement")) {
      liveTally = {};
      for (const a of roundAnswers) liveTally[a.optionId] = (liveTally[a.optionId] ?? 0) + 1;
    }

    let mySecretDeal: { task: Localized; reward: number } | undefined;
    if (round.secretDeal && viewerId && round.secretDeal.players.includes(viewerId)) {
      mySecretDeal = { task: round.secretDeal.task, reward: round.secretDeal.reward };
    }

    view.round = {
      id: round.id,
      index: round.index,
      kind: round.kind,
      title: round.title,
      body: round.body,
      prompt: q?.prompt,
      timeLimit: round.timeLimit,
      myOptions: viewerId && (iRespond || iAmHotSeat) ? optionsForPlayer(round, viewerId) : [],
      iRespond,
      iAmParticipant,
      iAmPredictor,
      iAnswered: viewerId ? roundAnswers.some((a) => a.playerId === viewerId) : false,
      answeredCount: roundAnswers.length,
      respondentCount: allowed.filter((id) => {
        const pl = state.players.find((p) => p.id === id);
        return pl?.connected;
      }).length,
      participants: round.participants,
      theory: round.theoryId
        ? state.theories.filter((t) => t.id === round.theoryId).map(publicTheory)[0]
        : undefined,
      talkSeconds: round.talkSeconds,
      talkPrompt: round.talkPrompt,
      stageInstruction: round.stageInstruction,
      hotSeatId: round.hotSeatId,
      iAmHotSeat,
      liveTally,
      mySecretDeal,
      prophecyCall: round.prophecy?.label,
    };
  }

  if (round && (REVEAL_PHASES.includes(state.phase) || state.phase.startsWith("AI_"))) {
    const outcome = state.outcomes.find((o) => o.roundId === round.id);
    if (outcome) {
      view.reveal = {
        lines: outcome.lines,
        scoreDelta: outcome.scoreDelta,
        majorityOptionId: outcome.majorityOptionId,
        contrarians: outcome.contrarians ?? [],
        answers: roundAnswers.map((a) => {
          const opts = optionsForPlayer(round, a.playerId);
          return {
            playerId: a.playerId,
            optionId: a.optionId,
            label: opts.find((o) => o.id === a.optionId)?.label ?? null,
          };
        }),
      };
    }
  }

  return view;
}
