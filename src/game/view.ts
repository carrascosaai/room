import { QUESTIONS_BY_ID } from "./questions";
import { currentRound, optionsForPlayer, respondents, totalRounds } from "./engine";
import type { GamePhase, GameState, Hypothesis, HypothesisCategory, Localized } from "./types";
import type { FinalReport } from "./report";

// ─────────────────────────────────────────────────────────────
// Projection: GameState -> what a specific player is allowed to
// see. Hidden data (an anonymous hypothesis's creator, a live
// counter-theory before reveal, another player's private decision)
// never crosses this boundary.
// ─────────────────────────────────────────────────────────────

export interface PlayerViewPlayer {
  id: string;
  nickname: string;
  score: number;
  theoryScore: number;
  isHost: boolean;
  connected: boolean;
}

export interface RevealAnswerRow {
  playerId: string;
  optionId: string;
  label: Localized | null;
}

export interface PublicHypothesis {
  id: string;
  /** null while anonymous and unrevealed */
  creatorId: string | null;
  targetId: string;
  category: HypothesisCategory;
  templateId: string;
  statement: Localized;
  confidence: number;
  status: Hypothesis["status"];
  counterOf?: string;
}

function publicHypothesis(h: Hypothesis, viewerId: string | null): PublicHypothesis {
  const showCreator = h.revealed || !h.anonymous || h.creatorId === viewerId;
  return {
    id: h.id,
    creatorId: showCreator ? h.creatorId : null,
    targetId: h.targetId,
    category: h.category,
    templateId: h.templateId,
    statement: h.statement,
    confidence: h.confidence,
    status: h.status,
    counterOf: h.counterOf,
  };
}

export interface PlayerView {
  code: string;
  phase: GamePhase;
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
    iAnswered: boolean;
    answeredCount: number;
    respondentCount: number;
    participants: string[];
    // ── hypothesis cycle ──
    authorId?: string;
    iAmAuthor: boolean;
    hypothesis?: PublicHypothesis;
    counterHypothesis?: PublicHypothesis;
    /** RELATIONSHIPS/SPICY test: the two named players to pick between */
    comparisonOptions?: string[];
  };

  reveal?: {
    lines: Localized[];
    answers: RevealAnswerRow[];
    scoreDelta: Record<string, number>;
    theoryScoreDelta: Record<string, number>;
    majorityOptionId?: string;
    contrarians: string[];
  };

  aiMessages: import("./types").AiMessage[];
  hypotheses: PublicHypothesis[];
  report?: FinalReport;
}

const REVEAL_PHASES: GamePhase[] = ["REVEAL", "CONFIDENCE_UPDATE"];

export function projectView(
  state: GameState,
  viewerId: string | null,
  meta: { storeKind?: "memory" | "supabase"; aiEnabled?: boolean; stage?: boolean } = {},
): PlayerView {
  const me = viewerId ? (state.players.find((p) => p.id === viewerId) ?? null) : null;
  const round = currentRound(state);
  const roundAnswers = round ? state.answers.filter((a) => a.roundId === round.id) : [];
  const isStage = meta.stage === true;

  const view: PlayerView = {
    code: state.code,
    phase: state.phase,
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
      theoryScore: p.theoryScore,
      isHost: p.isHost,
      connected: p.connected,
    })),
    minPlayers: 3,
    maxPlayers: 10,
    totalSlots: totalRounds(state),
    slotIndex: state.currentRoundIndex,
    aiMessages: state.aiMessages,
    hypotheses: state.hypotheses.map((h) => publicHypothesis(h, viewerId)),
    report: state.phase === "FINAL_REPORT" ? state.report : undefined,
  };

  if (round && state.phase !== "LOBBY" && state.phase !== "FINAL_REPORT") {
    const allowed = respondents(round);
    const iAmParticipant = viewerId ? round.participants.includes(viewerId) : false;
    const iRespond = viewerId ? allowed.includes(viewerId) : false;
    const iAmAuthor = !!viewerId && !!round.authorId && viewerId === round.authorId;
    const q = round.questionId ? QUESTIONS_BY_ID[round.questionId] : undefined;

    const hypothesis = round.hypothesisId ? state.hypotheses.find((h) => h.id === round.hypothesisId) : undefined;
    const counterHypothesis = round.counterHypothesisId ? state.hypotheses.find((h) => h.id === round.counterHypothesisId) : undefined;

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
      iAnswered: viewerId ? roundAnswers.some((a) => a.playerId === viewerId) : false,
      answeredCount: roundAnswers.length,
      respondentCount: allowed.filter((id) => state.players.find((p) => p.id === id)?.connected).length,
      participants: round.participants,
      authorId: round.authorId,
      iAmAuthor,
      hypothesis: hypothesis ? publicHypothesis(hypothesis, viewerId) : undefined,
      counterHypothesis: counterHypothesis ? publicHypothesis(counterHypothesis, viewerId) : undefined,
      comparisonOptions: round.test?.comparisonOptions,
    };
  }

  if (round && (REVEAL_PHASES.includes(state.phase))) {
    const outcome = state.outcomes.find((o) => o.roundId === round.id);
    if (outcome) {
      view.reveal = {
        lines: outcome.lines,
        scoreDelta: outcome.scoreDelta,
        theoryScoreDelta: outcome.theoryScoreDelta ?? {},
        majorityOptionId: outcome.majorityOptionId,
        contrarians: outcome.contrarians ?? [],
        answers: roundAnswers.map((a) => {
          const opts = optionsForPlayer(round, a.playerId);
          const label = opts.find((o) => o.id === a.optionId)?.label ?? null;
          return { playerId: a.playerId, optionId: a.optionId, label };
        }),
      };
    }
  }

  return view;
}
