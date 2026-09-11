"use client";

import { useParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { normalizeRoomCode } from "@/lib/id";
import { useStage } from "@/lib/useStage";
import { LanguageToggle, Logo, Dots } from "@/components/ui";
import { QrCode } from "@/components/QrCode";
import { Avatar, Leaderboard, PlayerList } from "@/components/room/PlayerBits";
import { AiEye } from "@/components/room/AiSpeech";
import { Timer } from "@/components/room/Timer";
import type { PlayerView } from "@/game/view";

// ─────────────────────────────────────────────────────────────
// THE STAGE — the shared screen. Cast it to a TV, or prop a phone
// up where everyone can see it. It never shows anything that's
// meant to be secret (deals, missions, individual answers before
// reveal) — only what the whole room is allowed to see at once.
// Phones still drive every action; this just watches and narrates.
// ─────────────────────────────────────────────────────────────

function baseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "";
}

export default function StagePage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? "");
  const { t } = useI18n();
  const { view, status } = useStage(code);

  return (
    <div className="relative left-1/2 min-h-[100dvh] w-screen -translate-x-1/2 bg-[var(--bg)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-8 py-6">
        <header className="flex items-center justify-between">
          <Logo size="text-2xl" />
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
              {t("stage.modeLabel")}
            </span>
            <LanguageToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10">
          {status === "gone" ? (
            <p className="text-center text-lg text-[var(--muted)]">{t("errors.room_not_found")}</p>
          ) : !view ? (
            <p className="flex items-center gap-2 text-[var(--muted)]">
              {t("common.connecting")} <Dots />
            </p>
          ) : (
            <StageBody view={view} code={code} />
          )}
        </main>
      </div>
    </div>
  );
}

function StageBody({ view, code }: { view: PlayerView; code: string }) {
  switch (view.phase) {
    case "LOBBY":
      return <StageLobby view={view} code={code} />;
    case "ROUND_INTRO":
      return <StageIntro view={view} />;
    case "DISCUSSION":
      return <StageDiscussion view={view} />;
    case "ANSWERING":
      return <StageAnswering view={view} />;
    case "REVEAL":
    case "ROUND_RESULT":
      return <StageReveal view={view} />;
    case "AI_OBSERVATION":
    case "AI_THEORY":
    case "AI_INTERVENTION":
      return <StageAiMoment view={view} />;
    case "FINAL_RESULTS":
      return <StageFinal view={view} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────── LOBBY

function StageLobby({ view, code }: { view: PlayerView; code: string }) {
  const { t } = useI18n();
  const joinUrl = `${baseUrl()}/room/${code}`;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">
        {t("lobby.title")}
      </p>
      <p className="mt-2 font-mono text-8xl font-bold tracking-[0.2em]">{code}</p>
      <div className="mt-8">
        <QrCode value={joinUrl} size={200} />
      </div>
      <p className="mt-4 text-lg text-[var(--muted)]">{t("stage.openOnPhone")}</p>
      <p className="mt-1 font-mono text-sm text-[var(--text)]">
        {t("stage.joinAt")} {joinUrl.replace(/^https?:\/\//, "")}
      </p>
      <div className="mt-10 w-full max-w-xl">
        <p className="mb-3 text-sm font-semibold">
          {t("lobby.playersJoined", { count: view.players.length, max: view.maxPlayers })}
        </p>
        <PlayerList view={view} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── ROUND INTRO

function StageIntro({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  return (
    <div className="text-center">
      <p className="font-mono text-lg uppercase tracking-[0.4em] text-[var(--muted)]">
        {t("game.roundIntro", { n: (r?.index ?? 0) + 1 })}
      </p>
      {r?.title ? <h1 className="mt-4 text-4xl font-bold">{loc(r.title)}</h1> : null}
      <div className="mt-8">
        <Dots />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── DISCUSSION

function StageDiscussion({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--danger)]">
        {t("director.talkNow")}
      </p>
      <div className="mt-6 scale-150">
        <Timer deadline={view.phaseDeadline} total={r.talkSeconds ?? r.timeLimit} />
      </div>
      {r.hotSeatId ? (
        <p className="mt-8 rounded-full border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-5 py-2 font-mono text-lg uppercase tracking-widest text-[var(--danger)]">
          {nameOf(view, r.hotSeatId)}
        </p>
      ) : null}
      {r.prophecyCall ? <p className="mt-8 max-w-2xl text-2xl font-semibold">{loc(r.prophecyCall)}</p> : null}
      <p className="mt-10 max-w-2xl text-4xl font-bold leading-tight">
        {r.talkPrompt ? loc(r.talkPrompt) : ""}
      </p>
      {r.stageInstruction ? (
        <p className="mt-6 max-w-xl text-lg text-[var(--muted)]">{loc(r.stageInstruction)}</p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────── ANSWERING

function StageAnswering({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;
  const prompt = r.body ?? r.prompt;
  return (
    <div className="flex w-full flex-col items-center text-center">
      {r.hotSeatId ? (
        <p className="mb-4 rounded-full border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-1.5 font-mono text-sm uppercase tracking-widest text-[var(--danger)]">
          {nameOf(view, r.hotSeatId)}
        </p>
      ) : null}
      {prompt ? <h1 className="max-w-2xl text-3xl font-bold leading-snug">{loc(prompt)}</h1> : null}

      {r.liveTally ? (
        <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
              {t("director.movementTallyLeft")}
            </p>
            <p className="tabnums mt-1 text-5xl font-bold">{r.liveTally.A ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
              {t("director.movementTallyRight")}
            </p>
            <p className="tabnums mt-1 text-5xl font-bold">{r.liveTally.B ?? 0}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex items-center gap-3">
        <Timer deadline={view.phaseDeadline} total={r.timeLimit} />
        <p className="text-[var(--muted)]">
          {r.answeredCount}/{r.respondentCount} · {t("stage.waitingForAnswers")}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── REVEAL

function StageReveal({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const reveal = view.reveal;
  const isResult = view.phase === "ROUND_RESULT";
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">
        {isResult ? t("common.leaderboard") : t("game.revealTitle")}
      </p>
      {isResult ? (
        <div className="mt-8 w-full max-w-md text-left">
          <Leaderboard view={view} />
        </div>
      ) : (
        <div className="mt-6 max-w-2xl space-y-3">
          {reveal?.lines.map((l, i) => (
            <p key={i} className="text-2xl font-semibold leading-snug">
              {loc(l)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── AI MOMENT

function StageAiMoment({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const phase = view.phase;
  const kinds =
    phase === "AI_THEORY"
      ? ["affinity", "theory"]
      : phase === "AI_OBSERVATION"
        ? ["observation"]
        : ["intervention"];
  const msg = [...view.aiMessages].reverse().find((m) => kinds.includes(m.kind));
  return (
    <div className="flex w-full flex-col items-center text-center">
      <AiEye active />
      <p className="mt-4 font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">{t("ai.name")}</p>
      <p className="mt-8 max-w-2xl text-3xl font-bold leading-snug">
        {msg ? loc(msg.text) : ""}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────── FINAL

function StageFinal({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const report = view.report;
  if (!report) return null;
  const accuracyPct = Math.round(report.aiAccuracy * 100);
  const winner = report.standings[0];
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-lg uppercase tracking-[0.3em] text-[var(--muted)]">{t("results.title")}</p>

      <div className="mt-8 flex items-baseline gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          {t("results.aiAccuracy")}
        </span>
        <span className="tabnums text-6xl font-bold text-[var(--accent)]">{accuracyPct}%</span>
      </div>

      {winner ? (
        <div className="mt-8 flex items-center gap-3">
          <Avatar player={view.players.find((p) => p.id === winner.playerId)!} size={40} />
          <p className="text-2xl font-bold">{nameOf(view, winner.playerId)}</p>
          <span className="tabnums text-xl text-[var(--muted)]">{winner.score} pts</span>
        </div>
      ) : null}

      <div className="mt-10 max-w-2xl">
        <p className="text-lg leading-relaxed">{loc(report.finalTheory)}</p>
      </div>

      <p className="mt-10 text-sm text-[var(--muted)]">{t("stage.castHint")}</p>
    </div>
  );
}

function nameOf(view: PlayerView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? "?";
}
