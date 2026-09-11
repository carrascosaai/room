"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import type { PlayerView } from "@/game/view";
import type { UseRoom } from "@/lib/useRoom";
import { Button, Dots, useCopy } from "@/components/ui";
import { QrCode } from "@/components/QrCode";
import { AiCard, AiSpeech } from "./AiSpeech";
import { Timer } from "./Timer";
import { Avatar, Leaderboard, PlayerList } from "./PlayerBits";

function baseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "";
}

function nameOf(view: PlayerView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? "?";
}

// ─────────────────────────────────────────── SECRET MISSION

export function SecretMissionBanner({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const [open, setOpen] = useState(false);
  if (!view.myMission) return null;
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="mt-3 w-full rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2 text-left"
    >
      <span className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--danger)]">
        {t("game.secretMission")}
        <span>{open ? "–" : "+"}</span>
      </span>
      {open ? (
        <span className="mt-1 block text-sm">
          {loc(view.myMission.text)}
          <span className="mt-1 block text-[11px] text-[var(--muted)]">
            {t("game.secretMissionHint")}
          </span>
        </span>
      ) : null}
    </button>
  );
}

// ─────────────────────────────────────────── LOBBY

export function Lobby({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t } = useI18n();
  const [copied, copy] = useCopy();
  const joinUrl = `${baseUrl()}/room/${view.code}`;
  const isHost = view.me?.isHost ?? false;
  const enough = view.players.length >= view.minPlayers;

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-[var(--muted)]">
        {t("lobby.title")}
      </p>
      <button
        onClick={() => copy(view.code)}
        className="mt-1 text-left font-mono text-5xl font-bold tracking-[0.15em]"
        aria-label={`Room code ${view.code}`}
      >
        {view.code}
      </button>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {copied ? t("common.copied") : t("lobby.shareThisCode")}
      </p>

      <div className="mt-6 flex items-center gap-4">
        <QrCode value={joinUrl} size={132} />
        <div className="text-sm text-[var(--muted)]">
          <p>{t("lobby.orScan")}</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--text)]">
            {joinUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>

      {isHost ? (
        <a
          href={`/stage/${view.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs font-mono uppercase tracking-widest text-[var(--accent)] underline underline-offset-4"
        >
          {t("lobby.openStage")} →
        </a>
      ) : null}

      <div className="mt-7 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {t("lobby.playersJoined", { count: view.players.length, max: view.maxPlayers })}
        </span>
      </div>
      <div className="mt-3">
        <PlayerList view={view} />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {isHost ? (
          <>
            <Button onClick={() => room.start()} disabled={!enough}>
              {t("lobby.startButton").toUpperCase()}
            </Button>
            {!enough ? (
              <p className="text-center text-xs text-[var(--muted)]">
                {t("lobby.needMore", { min: view.minPlayers })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
            {t("lobby.waitingForHost")} <Dots />
          </p>
        )}
        <Button variant="ghost" onClick={() => room.leave()}>
          {t("lobby.leave")}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── ROUND INTRO

export function RoundIntro({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const n = (r?.index ?? 0) + 1;
  const special = r?.kind.startsWith("ai_");
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center animate-fade-up">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
        {special ? t("ai.name") : t("game.roundIntro", { n })}
      </p>
      <h2 className="mt-3 text-2xl font-bold leading-tight">
        {r?.title ? loc(r.title) : special ? "" : t("game.yourChoice")}
      </h2>
      <div className="mt-8">
        <Dots />
      </div>
      {view.myMission ? (
        <div className="mt-10 w-full max-w-xs">
          <SecretMissionBanner view={view} />
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────── DISCUSSION (talk out loud)

export function DiscussionScreen({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--danger)]">
        {t("director.talkNow")}
      </p>

      <div className="mt-6">
        <Timer deadline={view.phaseDeadline} total={r.talkSeconds ?? r.timeLimit} />
      </div>

      {r.hotSeatId ? (
        <p className="mt-6 rounded-full border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-1.5 text-sm font-mono uppercase tracking-widest text-[var(--danger)]">
          {r.kind === "throne" ? "👑 " : ""}
          {nameOf(view, r.hotSeatId)}
        </p>
      ) : r.kind === "throne" ? (
        <p className="mt-6 rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-1.5 text-sm font-mono uppercase tracking-widest text-[var(--accent)]">
          👑 {t("director.throneEmptyBadge")}
        </p>
      ) : null}

      {r.prophecyCall ? (
        <p className="mt-6 text-lg font-semibold leading-snug">{loc(r.prophecyCall)}</p>
      ) : null}

      {r.mySecretDeal ? (
        <div className="mt-6 w-full max-w-xs rounded-2xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 p-4 text-left">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--danger)]">
            {t("director.dealBadge")}
          </p>
          <p className="mt-1 text-sm">{loc(r.mySecretDeal.task)}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{t("director.dealWarning")}</p>
        </div>
      ) : null}

      {r.myWhisper ? (
        <div
          className={`mt-6 w-full max-w-xs rounded-2xl border p-4 text-left ${
            r.myWhisper.kind === "mole"
              ? "border-[var(--danger)]/50 bg-[var(--danger)]/10"
              : "border-[var(--trust)]/50 bg-[var(--trust)]/10"
          }`}
        >
          <p
            className={`text-[10px] font-mono uppercase tracking-widest ${
              r.myWhisper.kind === "mole" ? "text-[var(--danger)]" : "text-[var(--trust)]"
            }`}
          >
            {r.myWhisper.kind === "mole" ? t("director.moleBadge") : t("director.intelBadge")}
          </p>
          <p className="mt-1 text-sm">{loc(r.myWhisper.text)}</p>
        </div>
      ) : null}

      <p className="mt-8 max-w-xs text-2xl font-bold leading-tight">
        {r.talkPrompt ? loc(r.talkPrompt) : t("director.talkNow")}
      </p>

      {r.stageInstruction ? (
        <p className="mt-4 max-w-xs text-sm text-[var(--muted)]">{loc(r.stageInstruction)}</p>
      ) : null}

      {view.myMission ? (
        <div className="mt-8 w-full max-w-xs">
          <SecretMissionBanner view={view} />
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────── ANSWER

export function AnswerScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [r?.id]);
  if (!r) return null;

  const prompt = r.body ?? r.prompt;
  const title = r.title ? loc(r.title) : null;
  const isDeal = r.kind === "deal";
  const isProphecy = r.kind === "prophecy";
  const isMovement = r.kind === "movement" || r.kind === "movement_switch";
  const isInterrogation = r.kind === "interrogation";
  const isThrone = r.kind === "throne";
  const isWhisper = r.kind === "whisper";
  const isFaceoff = r.kind === "faceoff";
  const isChemistry = r.kind === "chemistry";
  const isDealAccusing = isDeal && r.iAmPredictor && !r.iAmParticipant;
  const isPlayerPick =
    r.kind === "group_vote" ||
    r.kind === "trust" ||
    r.kind === "accusation" ||
    isDealAccusing ||
    isThrone ||
    isWhisper ||
    isFaceoff;
  const isAccusation = r.kind === "accusation";
  const isProphecyBet = isProphecy && r.iAmPredictor && !r.iAmParticipant;
  const isChemistryBet = isChemistry && r.iAmPredictor && !r.iAmParticipant;
  const waiting = Math.max(0, r.respondentCount - r.answeredCount);

  // a fresh salseo message tied to this round (affinity / accusation framing)
  const salseoMsg = [...view.aiMessages]
    .reverse()
    .find((m) => m.roundIndex === r.index && (m.kind === "affinity" || m.kind === "accusation"));

  const submit = (id: string) => {
    if (pending || r.iAnswered) return;
    setPending(id);
    room.answer(id);
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">{title}</p>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">
              {t("game.roundIntro", { n: r.index + 1 })}
            </p>
          )}
        </div>
        <Timer deadline={view.phaseDeadline} total={r.timeLimit} />
      </div>

      {salseoMsg ? (
        <div className="mt-3">
          <AiCard title={t("ai.name")} tone="accent">
            <AiSpeech text={salseoMsg.text} speed={14} />
          </AiCard>
        </div>
      ) : null}

      {isInterrogation && r.hotSeatId ? (
        <p className="mt-3 rounded-full border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3 py-1.5 text-center text-xs font-mono uppercase tracking-widest text-[var(--danger)]">
          {t("director.hotSeatBadge")} · {nameOf(view, r.hotSeatId)}
        </p>
      ) : null}

      {isThrone ? (
        <div className="mt-3 text-center">
          <p className="inline-block rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-[var(--accent)]">
            👑 {r.hotSeatId ? nameOf(view, r.hotSeatId) : t("director.throneEmptyBadge")}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{t("director.throneBonusHint")}</p>
        </div>
      ) : null}

      {prompt ? (
        <h2 className="mt-3 text-[22px] font-semibold leading-snug">{loc(prompt)}</h2>
      ) : null}

      {r.prophecyCall ? (
        <div className="mt-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-3 py-2 text-sm">
          {loc(r.prophecyCall)}
        </div>
      ) : null}

      {r.mySecretDeal ? (
        <div className="mt-3 rounded-2xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--danger)]">
            {t("director.dealBadge")}
          </p>
          <p className="mt-1 text-sm font-semibold">{t("director.dealYourTask")}</p>
          <p className="mt-1 text-sm">{loc(r.mySecretDeal.task)}</p>
          <p className="mt-2 text-xs text-[var(--accent)]">
            {t("director.dealReward", { n: r.mySecretDeal.reward })}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("director.dealWarning")}</p>
        </div>
      ) : isDealAccusing ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{t("director.dealOutsiderHint")}</p>
      ) : null}

      {r.myWhisper ? (
        <div
          className={`mt-3 rounded-2xl border p-4 ${
            r.myWhisper.kind === "mole"
              ? "border-[var(--danger)]/50 bg-[var(--danger)]/10"
              : "border-[var(--trust)]/50 bg-[var(--trust)]/10"
          }`}
        >
          <p
            className={`text-[10px] font-mono uppercase tracking-widest ${
              r.myWhisper.kind === "mole" ? "text-[var(--danger)]" : "text-[var(--trust)]"
            }`}
          >
            {r.myWhisper.kind === "mole" ? t("director.moleBadge") : t("director.intelBadge")}
          </p>
          <p className="mt-1 text-sm">{loc(r.myWhisper.text)}</p>
        </div>
      ) : null}

      {r.theory && !salseoMsg ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{loc(r.theory.evidence)}</p>
      ) : null}

      <SecretMissionBanner view={view} />

      {isMovement && r.liveTally ? (
        <div className="mt-4">
          {r.kind === "movement_switch" ? (
            <p className="mb-2 text-center text-[10px] font-mono uppercase tracking-widest text-[var(--danger)]">
              {t("director.switchBadge")}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <TallyBar label={t("director.movementTallyLeft")} count={r.liveTally.A ?? 0} />
            <TallyBar label={t("director.movementTallyRight")} count={r.liveTally.B ?? 0} />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex-1">
        {isInterrogation && r.iAmHotSeat ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <span className="rounded-full border border-[var(--danger)] px-4 py-2 text-sm font-semibold text-[var(--danger)]">
              {t("director.hotSeatBadge")}
            </span>
            <p className="text-sm text-[var(--muted)]">{t("director.hotSeatWaiting")}</p>
          </div>
        ) : !r.iRespond ? (
          <p className="mt-10 text-center text-sm text-[var(--muted)]">{t("game.spectating")}</p>
        ) : r.iAnswered ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <span className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
              {t("game.locked")}
            </span>
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
              {waiting > 0 ? t("game.waitingOthers", { count: waiting }) : t("common.waiting")}
              <Dots />
            </p>
            <p className="text-xs text-[var(--muted)]">{t("game.answerRecorded")}</p>
          </div>
        ) : (
          <>
            {isInterrogation && !r.iAmHotSeat ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">
                {t("director.rateThem")}
              </p>
            ) : isDealAccusing ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">
                {t("director.dealAccuseWho")}
              </p>
            ) : isProphecyBet ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--trust)]">
                {t("director.prophecyBetQuestion")}
              </p>
            ) : isThrone ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent)]">
                {t("director.throneVoteQuestion")}
              </p>
            ) : isWhisper ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">
                {t("director.whoIsMoleQuestion")}
              </p>
            ) : isFaceoff ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--danger)]">
                {t("director.faceoffVoteQuestion")}
              </p>
            ) : isChemistryBet ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--trust)]">
                {t("director.chemistryBetQuestion")}
              </p>
            ) : r.iAmPredictor && !r.iAmParticipant ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--trust)]">
                {t("game.predicting")}
              </p>
            ) : null}
            {!isInterrogation && !isDealAccusing && !isProphecyBet && !isThrone && !isWhisper && !isFaceoff && !isChemistryBet ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">
                {isAccusation
                  ? t("game.pointAtSomeone")
                  : isPlayerPick
                    ? t("game.pickPlayer")
                    : r.iAmPredictor && !r.iAmParticipant
                      ? t("game.predict")
                      : t("game.chooseOne")}
              </p>
            ) : null}
            <div className={isInterrogation ? "grid gap-2" : "grid gap-2.5"}>
              {r.myOptions.map((o) => {
                const asPlayer = view.players.find((p) => p.id === o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => submit(o.id)}
                    disabled={!!pending}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left text-[15px] transition active:scale-[0.99] hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    {asPlayer ? (
                      <Avatar player={asPlayer} size={26} />
                    ) : isInterrogation ? (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] font-mono text-xs text-[var(--muted)]">
                        {o.id}
                      </span>
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] font-mono text-xs text-[var(--muted)]">
                        {o.id.toUpperCase().slice(0, 1)}
                      </span>
                    )}
                    <span>{loc(o.label)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <MiniStandings view={view} />
    </div>
  );
}

function TallyBar({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="tabnums text-2xl font-bold">{count}</p>
    </div>
  );
}

function MiniStandings({ view }: { view: PlayerView }) {
  if (view.players.every((p) => p.score === 0)) return null;
  const top = [...view.players].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
      {top.map((p, i) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="font-mono">{i + 1}</span>
          <Avatar player={p} size={16} />
          <span className="tabnums">{p.score}</span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────── REVEAL

export function RevealScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const reveal = view.reveal;
  const isHost = view.me?.isHost ?? false;
  const isResult = view.phase === "ROUND_RESULT";

  const myDelta = view.me ? (reveal?.scoreDelta[view.me.id] ?? 0) : 0;
  const wentAgainst = view.me ? reveal?.contrarians.includes(view.me.id) : false;

  const RESULT_KINDS = [
    "affinity",
    "accusation",
    "theory_result",
    "verdict",
    "prophecy_result",
    "deal_reveal",
    "movement",
    "throne_result",
    "whisper_result",
    "chemistry_result",
    "faceoff_result",
  ];
  const resultMsg =
    r &&
    [...view.aiMessages]
      .reverse()
      .find((m) => m.roundIndex === r.index && RESULT_KINDS.includes(m.kind));

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">
        {isResult ? t("common.leaderboard") : t("game.revealTitle")}
      </p>

      {!isResult ? (
        <>
          <div className="mt-3 space-y-2">
            {reveal?.lines.map((l, i) => (
              <p key={i} className="text-[17px] font-semibold leading-snug">
                {loc(l)}
              </p>
            ))}
          </div>

          {resultMsg ? (
            <div className="mt-4">
              <AiCard title={t("ai.name")} tone="accent">
                <AiSpeech text={resultMsg.text} speed={14} />
              </AiCard>
            </div>
          ) : null}

          {wentAgainst ? (
            <p className="mt-3 text-sm font-semibold text-[var(--accent)]">
              {t("game.youWentAgainst")}
            </p>
          ) : null}

          {reveal && reveal.answers.length > 0 && r ? (
            <ul className="mt-5 space-y-1.5">
              {reveal.answers.map((a) => {
                const p = view.players.find((x) => x.id === a.playerId);
                if (!p) return null;
                return (
                  <li key={a.playerId} className="flex items-center gap-2.5 text-sm">
                    <Avatar player={p} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{p.nickname}</span>
                    <span className="truncate text-right">{a.label ? loc(a.label) : a.optionId}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {myDelta !== 0 ? (
            <p className="mt-4 tabnums text-sm text-[var(--muted)]">
              {myDelta > 0 ? "+" : ""}
              {myDelta} {t("common.points")}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-4">
          <Leaderboard view={view} />
        </div>
      )}

      <div className="mt-auto pt-8">
        {isHost ? (
          <Button onClick={() => room.advance()}>{t("game.hostContinue").toUpperCase()}</Button>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
            {t("common.waiting")} <Dots />
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── AI MOMENT

export function AiMoment({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t } = useI18n();
  const isHost = view.me?.isHost ?? false;
  const phase = view.phase;

  const msg = useMemo(() => {
    const kinds =
      phase === "AI_THEORY"
        ? ["affinity", "theory"]
        : phase === "AI_OBSERVATION"
          ? ["observation"]
          : ["intervention"];
    return [...view.aiMessages].reverse().find((m) => kinds.includes(m.kind));
  }, [view.aiMessages, phase]);

  const theory = view.round?.theory;
  const isAffinity = msg?.kind === "affinity";
  const title =
    phase === "AI_THEORY"
      ? isAffinity
        ? t("ai.affinityTitle")
        : t("ai.theoryTitle")
      : phase === "AI_INTERVENTION"
        ? t("ai.interventionTitle")
        : view.round && view.slotIndex === view.totalSlots - 1
          ? t("ai.finalObservationTitle")
          : t("ai.observationTitle");

  const [done, setDone] = useState(false);
  useEffect(() => setDone(false), [msg?.id]);

  return (
    <div className="flex flex-1 flex-col justify-center px-5 pb-8 pt-4 animate-fade-up">
      <AiCard title={t("ai.name")} tone={phase === "AI_INTERVENTION" ? "danger" : "accent"}>
        <p className="mb-3 text-lg font-bold leading-tight">{title}</p>
        {msg ? (
          <AiSpeech text={msg.text} onDone={() => setDone(true)} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            {t("ai.thinking")} <Dots />
          </p>
        )}

        {theory && phase === "AI_THEORY" && done ? (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <ConfidenceBar value={theory.confidence} label={t("ai.confidence")} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {theory.players.map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]"
                >
                  {nameOf(view, id)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </AiCard>

      <div className="mt-6">
        {isHost ? (
          <Button onClick={() => room.advance()} disabled={!done && !!msg}>
            {phase === "AI_THEORY" ? t("ai.theoryTestTitle") : t("game.hostContinue").toUpperCase()}
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
            {t("common.waiting")} <Dots />
          </p>
        )}
      </div>
    </div>
  );
}

export function ConfidenceBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
        <span>{label}</span>
        <span className="tabnums">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
