import { getAiProvider } from "@/ai/provider";
import { polishLatestAiMessage } from "@/ai/narrator";
import {
  addPlayer,
  advance,
  createGame,
  heartbeat,
  reconcilePresence,
  removePlayer,
  setLanguage,
  shouldAutoAdvance,
  startGame,
  submitAnswer,
} from "@/game/engine";
import { projectView, type PlayerView } from "@/game/view";
import type { GameMode, GameState, Lang } from "@/game/types";
import { getStore } from "@/store";
import { makeRoomCode, uuid } from "@/lib/id";
import { track } from "@/lib/analytics";

const AI_POLISH_KINDS = new Set(["AI_OBSERVATION", "AI_THEORY"]);

function meta(stage = false) {
  return { storeKind: getStore().kind, aiEnabled: getAiProvider().available, stage };
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  view?: PlayerView;
  playerId?: string;
  code?: string;
}

export async function createRoom(input: {
  nickname: string;
  lang: Lang;
  mode?: GameMode;
}): Promise<ActionResult> {
  const store = getStore();
  let code = makeRoomCode();
  for (let i = 0; i < 5 && (await store.exists(code)); i++) code = makeRoomCode();
  const playerId = uuid();
  const state = createGame(
    code,
    { id: playerId, nickname: input.nickname, lang: input.lang },
    input.mode ?? "director",
  );
  await store.create(state);
  await track("room_created", code, { players: 1, mode: state.mode });
  return { ok: true, code, playerId, view: projectView(state, playerId, meta()) };
}

export async function joinRoom(input: {
  code: string;
  nickname: string;
  lang: Lang;
  playerId?: string;
}): Promise<ActionResult> {
  const store = getStore();
  const existing = await store.get(input.code);
  if (!existing) return { ok: false, error: "room_not_found" };

  const playerId = input.playerId ?? uuid();
  let error: string | undefined;
  const next = await store.update(input.code, (s) => {
    const res = addPlayer(s, { id: playerId, nickname: input.nickname, lang: input.lang });
    error = res.error;
    return res.state;
  });
  if (!next) return { ok: false, error: "room_not_found" };
  if (error) return { ok: false, error };
  await track("room_joined", input.code, { players: next.players.length });
  return { ok: true, code: input.code, playerId, view: projectView(next, playerId, meta()) };
}

export async function getRoomView(
  code: string,
  playerId: string | null,
  stage = false,
): Promise<ActionResult> {
  const store = getStore();
  const base = await store.get(code);
  if (!base) return { ok: false, error: "room_not_found" };

  // presence + server-authoritative auto-advance during ANSWERING
  const next = await store.update(code, (s) => {
    let x = playerId ? heartbeat(s, playerId) : s;
    x = reconcilePresence(x);
    if (shouldAutoAdvance(x)) x = advance(x);
    return x;
  });
  const state = next ?? base;

  // best-effort AI polish for the big moments (fire and persist)
  if (AI_POLISH_KINDS.has(state.phase) && getAiProvider().available) {
    const polished = await polishLatestAiMessage(state).catch(() => state);
    if (polished !== state) {
      await store.update(code, (s) =>
        s.version <= polished.version ? { ...s, aiMessages: polished.aiMessages, version: polished.version } : s,
      );
      return { ok: true, view: projectView(polished, playerId, meta(stage)) };
    }
  }

  return { ok: true, view: projectView(state, playerId, meta(stage)) };
}

export async function startRoom(code: string, playerId: string): Promise<ActionResult> {
  const store = getStore();
  let error: string | undefined;
  const next = await store.update(code, (s) => {
    if (s.hostId !== playerId) {
      error = "not_host";
      return s;
    }
    const res = startGame(s);
    error = res.error;
    return res.state;
  });
  if (!next) return { ok: false, error: "room_not_found" };
  if (error) return { ok: false, error };
  await track("game_started", code, { players: next.players.length });
  return { ok: true, view: projectView(next, playerId, meta()) };
}

export async function answer(input: {
  code: string;
  playerId: string;
  optionId: string;
  targetId?: string;
}): Promise<ActionResult> {
  const store = getStore();
  let error: string | undefined;
  let advanced = false;
  const next = await store.update(input.code, (s) => {
    const res = submitAnswer(s, {
      playerId: input.playerId,
      optionId: input.optionId,
      targetId: input.targetId,
    });
    error = res.error;
    let x = res.state;
    if (!res.error && shouldAutoAdvance(x)) {
      x = advance(x);
      advanced = true;
    }
    return x;
  });
  if (!next) return { ok: false, error: "room_not_found" };
  if (error) return { ok: false, error };
  if (advanced) await afterAdvance(input.code, next);
  return { ok: true, view: projectView(next, input.playerId, meta()) };
}

export async function advanceRoom(
  code: string,
  playerId: string,
): Promise<ActionResult> {
  const store = getStore();
  let error: string | undefined;
  const next = await store.update(code, (s) => {
    const isHost = s.hostId === playerId;
    const past = s.phaseDeadline ? Date.now() >= s.phaseDeadline : true;
    // host can skip display phases early; anyone can nudge once the timer is up
    if (!isHost && !past) {
      error = "too_early";
      return s;
    }
    if (s.phase === "ANSWERING" && !shouldAutoAdvance(s) && !isHost) {
      error = "too_early";
      return s;
    }
    return advance(s);
  });
  if (!next) return { ok: false, error: "room_not_found" };
  if (error && error !== "too_early") return { ok: false, error };
  await afterAdvance(code, next);
  return { ok: true, view: projectView(next, playerId, meta()) };
}

export async function setRoomLanguage(
  code: string,
  playerId: string,
  lang: Lang,
): Promise<ActionResult> {
  const store = getStore();
  const next = await store.update(code, (s) => setLanguage(s, playerId, lang));
  if (!next) return { ok: false, error: "room_not_found" };
  return { ok: true, view: projectView(next, playerId, meta()) };
}

export async function leaveRoom(code: string, playerId: string): Promise<ActionResult> {
  const store = getStore();
  const next = await store.update(code, (s) => removePlayer(s, playerId));
  if (!next) return { ok: false, error: "room_not_found" };
  return { ok: true, view: projectView(next, playerId, meta()) };
}

// ---------- side effects after a transition ----------

async function afterAdvance(code: string, state: GameState): Promise<void> {
  const store = getStore();
  if (state.phase === "AI_THEORY") {
    const t = state.theories.find((x) => x.status === "testing" || x.status === "announced");
    await track("theory_created", code, { type: t?.type, confidence: t?.confidence });
  }
  if (state.phase === "AI_OBSERVATION") await track("ai_observation", code, {});
  if (state.phase === "AI_INTERVENTION") await track("ai_intervention", code, {});
  if (state.phase === "REVEAL") {
    await track("round_completed", code, { round: state.currentRoundIndex });
    const resolved = state.theories.find(
      (t) => t.status === "strengthened" || t.status === "discarded",
    );
    if (resolved?.status === "strengthened") await track("theory_success", code, { type: resolved.type });
    if (resolved?.status === "discarded") await track("theory_discarded", code, { type: resolved.type });
  }
  if (state.phase === "FINAL_RESULTS") {
    await track("game_completed", code, {
      accuracy: state.report?.aiAccuracy,
      players: state.players.length,
    });
    await store.archive(state).catch(() => undefined);
  }

  // polish AI text right after the transition so pollers see it quickly
  if (AI_POLISH_KINDS.has(state.phase) && getAiProvider().available) {
    const polished = await polishLatestAiMessage(state).catch(() => state);
    if (polished !== state) {
      await store.update(code, (s) => ({
        ...s,
        aiMessages: polished.aiMessages,
        version: Math.max(s.version, polished.version) + 1,
      }));
    }
  }
}
