import { QUESTIONS_BY_ID } from "./questions";
import { currentRound, optionsForPlayer, respondents } from "./engine";
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
}

export interface RevealAnswerRow {
  playerId: string;
  optionId: string;
  label: Localized | null;
}

export interface PlayerView {
  code: string;
  phase: GamePhase;
  version: number;
  phaseDeadline?: number;
  storeKind: "memory" | "supabase";
  aiEnabled: boolean;

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
  meta: { storeKind?: "memory" | "supabase"; aiEnabled?: boolean } = {},
): PlayerView {
  const me = viewerId ? state.players.find((p) => p.id === viewerId) ?? null : null;
  const round = currentRound(state);
  const roundAnswers = round ? state.answers.filter((a) => a.roundId === round.id) : [];

  const view: PlayerView = {
    code: state.code,
    phase: state.phase,
    version: state.version,
    phaseDeadline: state.phaseDeadline,
    storeKind: meta.storeKind ?? "memory",
    aiEnabled: meta.aiEnabled ?? false,
    me: me ? { id: me.id, isHost: me.isHost, connected: me.connected } : null,
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
    })),
    minPlayers: 3,
    maxPlayers: 10,
    totalSlots: state.plan.length,
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
    const q = round.questionId ? QUESTIONS_BY_ID[round.questionId] : undefined;

    view.round = {
      id: round.id,
      index: round.index,
      kind: round.kind,
      title: round.title,
      body: round.body,
      prompt: q?.prompt,
      timeLimit: round.timeLimit,
      myOptions: viewerId && iRespond ? optionsForPlayer(round, viewerId) : [],
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
